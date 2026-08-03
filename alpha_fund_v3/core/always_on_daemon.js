#!/usr/bin/env node
/**
 * ALWAYS-ON DAEMON v1.5
 * Runs continuously, executes build loop every minute, with RAM circuit breaker.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');

const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';
const LOCK_FILE = 'alpha_fund_v3/logs/always_on_daemon.lock';
const MAX_LOG_BYTES = 100 * 1024;
const RAM_BREAK_PCT = 95;
const RAM_WARN_PCT = 90;

let consecutiveRamHits = 0;

function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
      if (oldPid && oldPid !== process.pid) {
        try {
          process.kill(oldPid, 0);
          log(`Another daemon already running (PID ${oldPid}). Exiting.`);
          process.exit(0);
        } catch (e) {
          // old process is dead, continue
        }
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
  } catch (e) {
    log(`Lock error: ${e.message}`);
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const current = fs.readFileSync(LOCK_FILE, 'utf8');
      if (current === String(process.pid)) fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {}
}

process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });

acquireLock();

function rotateLog() {
  try {
    const out = execSync('wmic logicaldisk get size,freespace /format:csv', { windowsHide: true, encoding: 'utf8' });
    const lines = out.trim().split('\n').filter(l => l.includes(','));
    const last = lines[lines.length - 1];
    const parts = last.split(',');
    const free = parseInt(parts[parts.length - 2], 10);
    const size = parseInt(parts[parts.length - 1], 10);
    if (free && size && ((size - free) / size) * 100 >= 97) return;

    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      const archive = `${LOG_FILE}.${Date.now()}.old`;
      fs.renameSync(LOG_FILE, archive);
    }
  } catch(e) {}
}

function log(msg) {
  const cleanMsg = String(msg).replace(/[^\x20-\x7E]/g, '?');
  const entry = `[${new Date().toISOString()}] ${cleanMsg}\n`;
  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });
  rotateLog();
  fs.appendFileSync(LOG_FILE, entry);
}

function getRAM() {
  try {
    return Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  } catch(e) { return 0; }
}

function cleanupRAM() {
  try {
    log(`RAM ${getRAM()}% — running cleanup`);
    execSync('powershell.exe -Command "Get-Process node | Sort-Object WorkingSet -Descending | Select-Object -Skip 3 | Stop-Process -Force"', {
      windowsHide: true,
      timeout: 10000
    });
    log(`RAM after cleanup: ${getRAM()}%`);
  } catch(e) {
    log(`Cleanup error: ${e.message}`);
  }
}

function circuitBreaker() {
  const ram = getRAM();
  if (ram >= RAM_BREAK_PCT) {
    consecutiveRamHits++;
    log(`RAM CIRCUIT BREAKER HIT: ${ram}% (#${consecutiveRamHits})`);
    if (consecutiveRamHits >= 2) {
      log('Critical RAM — performing emergency cleanup');
      cleanupRAM();
    }
    return false;
  }
  if (ram >= RAM_WARN_PCT) {
    log(`RAM WARNING: ${ram}%`);
  }
  consecutiveRamHits = 0;
  return true;
}

function aliveCheck() {
  try {
    if (!circuitBreaker()) return false;
    log('ALIVE');
    return true;
  } catch(e) {
    log('ERROR: ' + e.message);
    return false;
  }
}

function runVerifier() {
  if (!circuitBreaker()) {
    log('Skipping verifier due to RAM circuit breaker');
    return;
  }
  try {
    log('Running safe capability verifier...');
    execSync('node safe_capability_verifier.js', {
      cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
      windowsHide: true,
      timeout: 300000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log('Verifier complete');
  } catch(e) {
    log('Verifier error: ' + e.message);
  }
}

if (process.argv.includes('--check-only')) {
  aliveCheck();
  process.exit(0);
}

log('Always-on daemon started');

setInterval(() => {
  aliveCheck();
}, 60000);

runVerifier();

setInterval(() => {
  runVerifier();
}, 600000);
