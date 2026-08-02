#!/usr/bin/env node
/**
 * ⚡ GATEWAY ULTRA-IMMORTALITY v2.0
 * 5-second detection, 10-second recovery
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ultra_immortality.log');
const STATE_FILE = path.join(LOG_DIR, 'ultra_state.json');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  check_interval_ms: 5000, // 5 SECONDS
  max_restarts_per_10min: 3,
  ram_restart_threshold: 94, // Lower threshold for faster action
  gateway_min_ram_mb: 300
};

// ─── STATE ──────────────────────────────────────────────────
let state = {
  checks: 0,
  restarts: 0,
  last_restart: null,
  last_check: null,
  consecutive_failures: 0,
  start_time: new Date().toISOString(),
  is_immortal: true
};

function log(level, msg, data = {}) {
  const entry = `[${new Date().toISOString()}] [${level}] ${msg} ${JSON.stringify(data)}\n`;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
  }
}

// ─── FAST CHECK ───────────────────────────────────────────
function fastCheck() {
  try {
    // Ultra-fast: just check if any large node process exists
    const tasks = execSync('tasklist /FI "MEMUSAGE gt 300000" /FO CSV /NH', { 
      encoding: 'utf8', 
      timeout: 3000 
    });
    return tasks.includes('node.exe');
  } catch(e) {
    return false;
  }
}

// ─── RAM ────────────────────────────────────────────────────
function getRAM() {
  try {
    const os = require('os');
    return Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  } catch(e) { return 0; }
}

// ─── KILL AND RESTART ─────────────────────────────────────
function killAndRestart(reason) {
  const now = Date.now();
  
  // Check rate limit
  if (state.last_restart) {
    const lastTime = new Date(state.last_restart).getTime();
    if ((now - lastTime) < (10 * 60 * 1000 / CONFIG.max_restarts_per_10min)) {
      log('WARN', 'Rate limited', { reason });
      return { status: 'rate_limited' };
    }
  }
  
  log('CRITICAL', `ULTRA-RESTART: ${reason}`, { ram: getRAM() });
  
  // Kill ALL node processes immediately
  try {
    execSync('taskkill /F /IM node.exe /T', { timeout: 5000 });
  } catch(e) {}
  
  // Start gateway with highest priority
  setTimeout(() => {
    try {
      const child = spawn('cmd.exe', ['/c', 'start', '/B', '/HIGH', 'openclaw', 'gateway', 'start'], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
      });
      child.unref();
      
      state.restarts++;
      state.last_restart = new Date().toISOString();
      state.consecutive_failures = 0;
      saveState();
      
      log('INFO', 'Gateway restarted', { pid: child.pid });
    } catch(e) {
      log('ERROR', 'Restart failed', { error: e.message });
    }
  }, 2000);
  
  return { status: 'restarting', reason };
}

// ─── MAIN ─────────────────────────────────────────────────
function run() {
  loadState();
  state.checks++;
  
  const running = fastCheck();
  const ram = getRAM();
  
  log('INFO', 'Ultra-check', { running, ram, check: state.checks });
  
  if (!running) {
    state.consecutive_failures++;
    log('CRITICAL', `Gateway missing (failure #${state.consecutive_failures})`);
    
    if (state.consecutive_failures >= 2) {
      // 2 consecutive failures = 10 seconds down = restart NOW
      return killAndRestart('gateway_missing_10s');
    }
    
    return { status: 'warning', failures: state.consecutive_failures };
  }
  
  // Reset failure counter on success
  state.consecutive_failures = 0;
  
  // RAM check
  if (ram >= CONFIG.ram_restart_threshold) {
    return killAndRestart(`ram_${ram}`);
  }
  
  saveState();
  return { status: 'healthy', ram };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run, fastCheck, getRAM, killAndRestart, state };

// ─── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const result = run();
  console.log(JSON.stringify(result));
  process.exit(result.status === 'healthy' ? 0 : 1);
}
