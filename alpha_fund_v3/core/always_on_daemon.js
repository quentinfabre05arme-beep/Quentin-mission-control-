#!/usr/bin/env node
/**
 * 🤖 ALWAYS-ON DAEMON
 * Runs continuously, no sleep mode, executes build loop every minute
 */

const fs = require('fs');
const { execSync } = require('child_process');

const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';

const MAX_LOG_BYTES = 100 * 1024;

function rotateLog() {
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      const archive = `${LOG_FILE}.${Date.now()}.old`;
      fs.renameSync(LOG_FILE, archive);
    }
  } catch(e) {}
}

function log(msg) {
  const cleanMsg = msg.replace(/[^\x20-\x7E]/g, '?');
  const entry = `[${new Date().toISOString()}] ${cleanMsg}\n`;
  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });
  rotateLog();
  fs.appendFileSync(LOG_FILE, entry);
}

function aliveCheck() {
  try {
    log('ALIVE');
    return true;
  } catch(e) {
    log('ERROR: ' + e.message);
    return false;
  }
}

function runVerifier() {
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

// Run every 60 seconds
log('Always-on daemon started');

setInterval(() => {
  aliveCheck();
}, 60000);

// Initial verifier
runVerifier();

// Run verifier every 10 minutes (not every minute to reduce load)
setInterval(() => {
  runVerifier();
}, 600000);
