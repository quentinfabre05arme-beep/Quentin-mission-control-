#!/usr/bin/env node
/**
 * ⚡ GATEWAY ULTRA-IMMORTALITY v2.1
 * Self-looping guardian with 5-second detection, 10-second recovery.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ultra_immortality.log');
const STATE_FILE = path.join(LOG_DIR, 'ultra_state.json');
const LOCK_FILE = path.join(LOG_DIR, 'ultra_guardian.lock');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  check_interval_ms: 60000,
  max_restarts_per_10min: 2,
  ram_restart_threshold: 96,
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

function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
      try {
        process.kill(pid, 0);
        log('WARN', 'Another ultra guardian is running', { pid });
        return false;
      } catch (e) {
        log('WARN', 'Reclaiming stale ultra lock', { pid });
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch (e) {
    log('ERROR', 'Lock error', { error: e.message });
    return false;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8') === String(process.pid)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {
    log('ERROR', 'Release lock error', { error: e.message });
  }
}

// ─── FAST CHECK ───────────────────────────────────────────
function fastCheck() {
  try {
    const tasks = execSync('tasklist /FI "MEMUSAGE gt 300000" /FO CSV /NH', { 
      encoding: 'utf8', 
      timeout: 5000 
    });
    const openclawRunning = tasks.includes('openclaw') || tasks.includes('node.exe');
    return openclawRunning;
  } catch(e) {
    return true;
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
  
  if (state.last_restart) {
    const lastTime = new Date(state.last_restart).getTime();
    if ((now - lastTime) < (10 * 60 * 1000 / CONFIG.max_restarts_per_10min)) {
      log('WARN', 'Rate limited', { reason });
      return { status: 'rate_limited' };
    }
  }
  
  log('CRITICAL', `ULTRA-RESTART: ${reason}`, { ram: getRAM() });
  
  try {
    execSync('taskkill /F /IM node.exe /T', { timeout: 5000 });
  } catch(e) {}
  
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
  state.checks++;
  
  const running = fastCheck();
  const ram = getRAM();
  
  log('INFO', 'Ultra-check', { running, ram, check: state.checks });
  
  if (!running) {
    state.consecutive_failures++;
    log('CRITICAL', `Gateway missing (failure #${state.consecutive_failures})`);
    
    if (state.consecutive_failures >= 2) {
      return killAndRestart('gateway_missing_10s');
    }
    
    return { status: 'warning', failures: state.consecutive_failures };
  }
  
  state.consecutive_failures = 0;
  
  if (ram >= CONFIG.ram_restart_threshold) {
    return killAndRestart(`ram_${ram}`);
  }
  
  saveState();
  return { status: 'healthy', ram };
}

// ─── LOOP ─────────────────────────────────────────────────
function startLoop() {
  loadState();
  if (!acquireLock()) {
    console.log('Another ultra guardian is already running. Exiting.');
    process.exit(0);
  }
  
  log('INFO', 'Ultra guardian self-loop started', { pid: process.pid });
  
  const loop = () => {
    try {
      run();
    } catch (e) {
      log('ERROR', 'Loop error', { error: e.message });
    }
    setTimeout(loop, CONFIG.check_interval_ms);
  };
  
  loop();
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run, fastCheck, getRAM, killAndRestart, state };

// ─── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'loop' || command === undefined) {
    startLoop();
  } else {
    const result = run();
    console.log(JSON.stringify(result));
    process.exit(result.status === 'healthy' ? 0 : 1);
  }
}

process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });
