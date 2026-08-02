#!/usr/bin/env node
/**
 * 🤖 ALWAYS-ON DAEMON
 * Runs continuously, no sleep mode, executes build loop every minute
 */

const fs = require('fs');
const { execSync } = require('child_process');

const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function aliveCheck() {
  try {
    log('ALIVE');
    // Every minute, run a tiny operation to prove existence
    return true;
  } catch(e) {
    log('ERROR: ' + e.message);
    return false;
  }
}

function runBuildLoop() {
  try {
    log('Running build loop...');
    execSync('node alpha_fund_v3/core/build_loop_continuous.js', {
      cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
      windowsHide: true,
      timeout: 300000
    });
    log('Build loop complete');
  } catch(e) {
    log('Build loop error: ' + e.message);
  }
}

// Run every 60 seconds
log('Always-on daemon started');
let ticks = 0;

setInterval(() => {
  ticks++;
  aliveCheck();
  
  // Every 60 ticks (1 hour), run build loop
  if (ticks % 60 === 0) {
    runBuildLoop();
  }
}, 60000);

// Initial build loop
runBuildLoop();
