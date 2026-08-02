#!/usr/bin/env node
/**
 * 🤖 ALWAYS-ON DAEMON
 * Runs continuously, no sleep mode, executes build loop every minute
 */

const fs = require('fs');
const { execSync } = require('child_process');

const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';

function log(msg) {
  const cleanMsg = msg.replace(/[^\x20-\x7E]/g, '?');
  const entry = `[${new Date().toISOString()}] ${cleanMsg}\n`;
  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function aliveCheck() {
  try {
    log('ALIVE');
    // Every minute, run build loop
    runBuildLoop();
    return true;
  } catch(e) {
    log('ERROR: ' + e.message);
    return false;
  }
}

function runBuildLoop() {
  try {
    log('Running Project Claw Core build loop...');
    execSync('node project_claw_core/core/build_loop_continuous.js', {
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

setInterval(() => {
  aliveCheck();
}, 60000);

// Initial build loop
runBuildLoop();
