#!/usr/bin/env node
/**
 * ALPHA FUND v3.0 — 15-MINUTE RESEARCH LOOP
 * Runs research continuously every 15 minutes, caches TA data,
 * skips failing assets, never gets stuck.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'logs', 'research_loop.log');
const LOCK_FILE = path.join(ROOT, 'logs', 'research_loop.lock');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(msg);
}

function isLocked() {
  if (!fs.existsSync(LOCK_FILE)) return false;
  const stats = fs.statSync(LOCK_FILE);
  const ageMs = Date.now() - stats.mtimeMs;
  // Stale lock if older than 10 minutes
  if (ageMs > 10 * 60 * 1000) {
    fs.unlinkSync(LOCK_FILE);
    return false;
  }
  return true;
}

function setLock() {
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

function clearLock() {
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
}

async function runOnce() {
  log('═══════════════════════════════════════════');
  log('🔬 Starting 15-minute research cycle');
  log('═══════════════════════════════════════════');
  
  try {
    const output = execSync('node alpha_fund_v3/orchestrator.js research', {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5 * 60 * 1000 // 5 minutes max per cycle
    });
    
    log(output);
    log('✅ Cycle complete');
    
    // Auto-commit if any changes
    try {
      execSync('git add alpha_fund_v3/data/ alpha_fund_v3/logs/ 2> nul', { cwd: process.cwd(), windowsHide: true });
      const status = execSync('git status --porcelain', { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
      if (status.trim()) {
        execSync('git commit -m "Auto: Alpha Fund 15-min research cycle snapshot"', {
          cwd: process.cwd(),
          windowsHide: true,
          timeout: 30000
        });
        log('📦 Committed snapshot');
      }
    } catch(e) {
      log('⚠️ Git commit skipped: ' + e.message);
    }
    
  } catch(e) {
    log('❌ Cycle failed: ' + e.message);
  }
}

async function main() {
  if (isLocked()) {
    console.log('Research loop already running. Exiting.');
    process.exit(0);
  }
  
  setLock();
  
  // Run immediately, then every 15 minutes
  await runOnce();
  
  setInterval(async () => {
    await runOnce();
  }, 15 * 60 * 1000);
  
  log('🔄 Loop active: every 15 minutes');
}

process.on('SIGINT', () => {
  clearLock();
  process.exit(0);
});

process.on('uncaughtException', (e) => {
  log('💥 Uncaught: ' + e.message);
  clearLock();
});

if (require.main === module) {
  main().catch(e => {
    log('💥 Fatal: ' + e.message);
    clearLock();
  });
}

module.exports = { runOnce };
