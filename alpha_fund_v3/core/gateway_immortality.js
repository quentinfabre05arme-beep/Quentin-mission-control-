#!/usr/bin/env node
/**
 * 🔄 GATEWAY IMMORTALITY ENGINE
 * Detects crashes, restarts automatically, never stays down
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'immortality.log');
const STATE_FILE = path.join(LOG_DIR, 'immortality_state.json');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  check_interval_sec: 30,
  max_restarts_per_hour: 3,
  ram_restart_threshold: 96,
  gateway_cmd: 'openclaw gateway start',
  pid_check_cmd: 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV'
};

// ─── STATE ──────────────────────────────────────────────────
let state = {
  start_time: new Date().toISOString(),
  checks_performed: 0,
  restarts_count: 0,
  last_restart: null,
  last_check: null,
  uptime_seconds: 0,
  is_immortal: true
};

// ─── LOG ────────────────────────────────────────────────────
function log(level, message, data = {}) {
  const entry = `[${new Date().toISOString()}] [${level}] ${message} ${JSON.stringify(data)}\n`;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[${level}] ${message}`);
}

// ─── SAVE/LOAD STATE ────────────────────────────────────────
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
    const result = execSync(CONFIG.pid_check_cmd, { encoding: 'utf8', timeout: 5000 });
    // Gateway is the largest node process (>500MB)
    const lines = result.split('\n').filter(l => l.includes('node.exe'));
    for (const line of lines) {
      const parts = line.replace(/"/g, '').split(',');
      if (parts.length >= 5) {
        const memStr = parts[4].trim();
        const memMB = parseInt(memStr.replace(/[^0-9]/g, '')) / 1024;
        if (memMB > 300) return true; // Large node process = gateway
      }
    }
    return false;
  } catch(e) {
    return false;
  }
}

// ─── GET RAM ────────────────────────────────────────────────
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
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  // Check restart limits
  // (In real implementation, track restart history)
  if (state.restarts_count > 0 && state.last_restart) {
    const lastRestartTime = new Date(state.last_restart).getTime();
    if ((now - lastRestartTime) < (60 * 60 * 1000 / CONFIG.max_restarts_per_hour)) {
      log('WARNING', 'Restart rate limit — waiting before next restart', { 
        restarts: state.restarts_count,
        last_restart: state.last_restart 
      });
      return { status: 'rate_limited', reason: 'too_many_restarts' };
    }
  }
  
  log('CRITICAL', `RESTARTING GATEWAY: ${reason}`, { ram: getRAM() });
  
  // Kill all large node processes
  try {
    execSync('taskkill /F /FI "MEMUSAGE gt 500000" /IM node.exe', { encoding: 'utf8' });
    log('INFO', 'Killed large node processes');
  } catch(e) {
    log('WARNING', 'Could not kill processes (may not exist)');
  }
  
  // Wait 3 seconds then restart
  setTimeout(() => {
    try {
      const child = spawn('openclaw', ['gateway', 'start'], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
        cwd: process.env.USERPROFILE
      });
      child.unref();
      
      state.restarts_count++;
      state.last_restart = new Date().toISOString();
      saveState();
      
      log('INFO', 'Gateway restart initiated', { new_pid: child.pid });
    } catch(e) {
      log('ERROR', 'Failed to restart gateway', { error: e.message });
    }
  }, 3000);
  
  return { status: 'restarting', reason };
}

// ─── HEALTH CHECK ─────────────────────────────────────────
function healthCheck() {
  const ram = getRAM();
  const running = isGatewayRunning();
  
  state.checks_performed++;
  state.last_check = new Date().toISOString();
  state.uptime_seconds += CONFIG.check_interval_sec;
  
  log('INFO', 'Health check', { ram, running, checks: state.checks_performed });
  
  // If not running, restart immediately
  if (!running) {
    log('CRITICAL', 'GATEWAY NOT RUNNING — AUTO-RESTARTING');
    return restartGateway('gateway_not_detected');
  }
  
  // If RAM critical, restart
  if (ram >= CONFIG.ram_restart_threshold) {
    log('CRITICAL', `RAM CRITICAL (${ram}%) — RESTARTING GATEWAY`);
    return restartGateway(`ram_critical_${ram}`);
  }
  
  return { status: 'healthy', ram, running };
}

// ─── MAIN LOOP ────────────────────────────────────────────
function run() {
  loadState();
  
  console.log('╔══════════════════════════════════════════╗');
  console.log('║ 🔄 GATEWAY IMMORTALITY ENGINE ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Started: ${state.start_time}`);
  console.log(`Checks: ${state.checks_performed}`);
  console.log(`Restarts: ${state.restarts_count}`);
  console.log('');
  
  const result = healthCheck();
  
  console.log('');
  console.log(`Result: ${result.status}`);
  if (result.ram) console.log(`RAM: ${result.ram}%`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  
  saveState();
  
  return result;
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run, healthCheck, isGatewayRunning, restartGateway, state };

// ─── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const result = run();
  process.exit(result.status === 'healthy' ? 0 : 1);
}
