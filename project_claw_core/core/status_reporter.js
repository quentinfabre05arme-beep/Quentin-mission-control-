#!/usr/bin/env node
/**
 * 📊 PROJECT CLAW CORE — 10-MINUTE STATUS REPORTER
 * Sends Telegram summary every 10 minutes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'logs', 'status_reporter.log');

function log(msg) {
  const cleanMsg = msg.replace(/[^\x20-\x7E]/g, '?');
  const entry = `[${new Date().toISOString()}] ${cleanMsg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function getCapabilityFiles() {
  const dirs = ['core', 'agents', 'memory'];
  const files = [];
  dirs.forEach(dir => {
    const fullDir = path.join(ROOT, dir);
    if (fs.existsSync(fullDir)) {
      fs.readdirSync(fullDir).filter(f => f.endsWith('.js')).forEach(f => files.push(`${dir}/${f}`));
    }
  });
  return files;
}

function readLastBuildLog() {
  const buildLog = path.join(ROOT, 'logs', 'build_loop.log');
  if (!fs.existsSync(buildLog)) return 'No build log yet';
  const lines = fs.readFileSync(buildLog, 'utf8').split('\n').filter(l => l.trim());
  return lines.slice(-10).join('\n');
}

function readLastVerifyLog() {
  const verifyLog = path.join(ROOT, 'logs', 'verifier.log');
  if (!fs.existsSync(verifyLog)) return 'No verify log yet';
  const lines = fs.readFileSync(verifyLog, 'utf8').split('\n').filter(l => l.trim());
  const lastVerify = lines.findLast(l => l.includes('Verified:')) || 'No verification found';
  return lastVerify;
}

function generateReport() {
  const files = getCapabilityFiles();
  const total = files.length;
  const target = 200;
  const progress = ((total / target) * 100).toFixed(1);
  
  const recentBuilds = readLastBuildLog();
  const lastVerify = readLastVerifyLog();
  
  const recentBuilt = recentBuilds.split('\n').filter(l => l.includes('BUILT:') || l.includes('BUILT')).slice(-5);
  
  let blockers = [];
  if (recentBuilt.length === 0 && total < 30) {
    blockers.push('Initial capability list exhausted — need to expand CAPABILITIES array');
  }
  if (lastVerify.includes('failed') && !lastVerify.includes('0 failed')) {
    blockers.push('Some capabilities failed verification');
  }
  
  const report = `Project Claw Core — 10-Min Report
Time: ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })} CET

PROGRESS
--------
Capabilities: ${total} / ${target} (${progress}%)
Target: Full human-level autonomous agent
Loop: Every 60 seconds

LAST BUILDS
-----------
${recentBuilt.length ? recentBuilt.map(b => '- ' + b.replace('BUILT: ', '').replace('BUILT ', '')).join('\n') : 'No new builds in last 10 minutes'}

VERIFICATION
------------
${lastVerify.replace(/^\[[^\]]+\]\s*/, '')}

${blockers.length ? `BLOCKERS\n--------\n${blockers.map(b => '- ' + b).join('\n')}` : 'NO BLOCKERS'}

CREDENTIALS NEEDED
------------------
None currently. Will ask if new accounts/APIs needed.

Status: Building.`;

  return report;
}

function sendTelegram(message) {
  try {
    const reportFile = path.join(ROOT, 'logs', 'last_report.txt');
    fs.writeFileSync(reportFile, message);
    log('Report saved to ' + reportFile);
    
    // Try to send via Telegram bot API using BOT_TOKEN from environment
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      const chatId = '8685343197';
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const params = new URLSearchParams({ chat_id: chatId, text: message, parse_mode: 'Markdown' });
      execSync(`powershell -c "Invoke-RestMethod -Uri '${url}' -Method POST -Body '${params.toString()}'"`, { windowsHide: true, timeout: 30000 });
      log('Telegram message sent');
    } else {
      log('No TELEGRAM_BOT_TOKEN env var — report saved to file only');
    }
    
    return true;
  } catch(e) {
    log('Report error: ' + e.message);
    return false;
  }
}

function run() {
  log('Generating 10-minute report');
  const report = generateReport();
  sendTelegram(report);
  console.log(report);
}

module.exports = { generateReport, sendTelegram, run };

if (require.main === module) {
  run();
}
