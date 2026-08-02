#!/usr/bin/env node
/**
 * 🔄 GATEWAY SELF-CONTROL ENGINE
 * Can restart itself without human help
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'gateway_control.log');
const STATE_FILE = path.join(__dirname, '..', 'logs', 'gateway_state.json');
const PID_FILE = path.join(__dirname, '..', '..', '.openclaw.pid');
const RESTART_REQUEST = path.join(__dirname, '..', '..', '.RESTART_GATEWAY_REQUESTED');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  gateway_cmd: 'openclaw gateway start',
  check_interval_ms: 30000, // 30 seconds
  max_restarts_per_hour: 3,
  ram_threshold: 95
};

// ─── STATE ──────────────────────────────────────────────────
let state = {
  restarts_today: 0,
  last_restart: null,
  restart_history: [],
  gateway_pid: null,
  status: 'unknown'
};

// ─── LOG ────────────────────────────────────────────────────
function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

// ─── SAVE/LOAD STATE ──────────────────────────────────────
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
  }
}

// ─── CHECK IF GATEWAY RUNNING ─────────────────────────────
function isGatewayRunning() {
  try {
    // Check if openclaw process exists
    const result = exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', { encoding: 'utf8' });
    return result.includes('node.exe');
  } catch(e) {
    return false;
  }
}

// ─── GET GATEWAY PID ──────────────────────────────────────
function getGatewayPID() {
  try {
    const result = exec('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv', { encoding: 'utf8' });
    const lines = result.split('\n').filter(l => l.includes('openclaw'));
    if (lines.length > 0) {
      const parts = lines[0].split(',');
      return parseInt(parts[parts.length - 1].trim());
    }
  } catch(e) {
    return null;
  }
}

// ─── CHECK RAM ────────────────────────────────────────────
function getRAM() {
  try {
    const os = require('os');
    return Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  } catch(e) {
    return 0;
  }
}

// ─── RESTART GATEWAY ────────────────────────────────────────
function restartGateway(reason) {
  log('WARNING', `Restarting gateway: ${reason}`);
  
  // Check restart limits
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  const recentRestarts = state.restart_history.filter(r => r > hourAgo).length;
  
  if (recentRestarts >= CONFIG.max_restarts_per_hour) {
    log('CRITICAL', `Too many restarts (${recentRestarts}/hour). Waiting.`);
    return { status: 'blocked', reason: 'restart_limit' };
  }
  
  // Record restart
  state.restarts_today++;
  state.last_restart = new Date().toISOString();
  state.restart_history.push(now);
  // Keep only last 24 hours
  state.restart_history = state.restart_history.filter(r => r > (now - 24 * 60 * 60 * 1000));
  saveState();
  
  // Kill existing gateway processes
  try {
    exec('taskkill /F /IM node.exe /FI "MEMUSAGE gt 500000"', { encoding: 'utf8' });
    log('INFO', 'Killed large node processes');
  } catch(e) {
    log('WARNING', 'Could not kill processes: ' + e.message);
  }
  
  // Wait 5 seconds
  setTimeout(() => {
    // Start new gateway
    try {
      const child = spawn('cmd.exe', ['/c', 'openclaw', 'gateway', 'start'], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
      });
      child.unref();
      log('INFO', `Gateway restart initiated. New PID: ${child.pid}`);
      
      // Clear restart request
      if (fs.existsSync(RESTART_REQUEST)) {
        fs.unlinkSync(RESTART_REQUEST);
      }
      
      return { status: 'restarted', pid: child.pid };
    } catch(e) {
      log('ERROR', 'Failed to restart gateway: ' + e.message);
      return { status: 'failed', error: e.message };
    }
  }, 5000);
  
  return { status: 'restarting' };
}

// ─── CHECK FOR RESTART REQUESTS ─────────────────────────────
function checkRestartRequests() {
  if (fs.existsSync(RESTART_REQUEST)) {
    const reason = fs.readFileSync(RESTART_REQUEST, 'utf8');
    fs.unlinkSync(RESTART_REQUEST);
    return restartGateway(reason);
  }
  return null;
}

// ─── HEALTH CHECK ───────────────────────────────────────────
function healthCheck() {
  const ram = getRAM();
  const running = isGatewayRunning();
  const pid = getGatewayPID();
  
  state.gateway_pid = pid;
  state.status = running ? 'running' : 'down';
  
  log('INFO', 'Health check', { ram, running, pid });
  
  // Auto-restart if down
  if (!running) {
    log('CRITICAL', 'Gateway not running — auto-restarting');
    return restartGateway('gateway_not_running');
  }
  
  // Restart if RAM critical
  if (ram >= CONFIG.ram_threshold) {
    log('CRITICAL', `RAM critical (${ram}%) — auto-restarting gateway`);
    return restartGateway(`ram_critical_${ram}`);
  }
  
  return { status: 'healthy', ram, pid };
}

// ─── MAIN LOOP ──────────────────────────────────────────────
function run() {
  loadState();
  
  console.log('╔══════════════════════════════════════════╗');
  console.log('║ 🔄 GATEWAY SELF-CONTROL ENGINE ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Status: ${state.status}`);
  console.log(`Restarts today: ${state.restarts_today}`);
  console.log(`RAM: ${getRAM()}%`);
  console.log('');
  
  // Check for restart requests first
  const request = checkRestartRequests();
  if (request) {
    console.log('Restart request processed:', request.status);
    return request;
  }
  
  // Run health check
  const health = healthCheck();
  console.log('Health check:', health.status, `RAM: ${health.ram}%`);
  
  saveState();
  
  return health;
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run, restartGateway, healthCheck, isGatewayRunning };

// ─── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const result = run();
  console.log('');
  console.log('Result:', JSON.stringify(result, null, 2));
  
  // If not healthy, exit with error code so Task Scheduler retries
  if (result.status === 'healthy') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}
