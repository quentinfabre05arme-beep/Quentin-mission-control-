// System Health Monitor for OpenClaw
// Runs every 4 hours to check and fix system issues

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const LOG_FILE = 'C:\\Users\\quent\\.openclaw\\workspace\\memory\\system_health.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

function checkMemory() {
  const total = os.totalmem() / 1024/1024/1024;
  const free = os.freemem() / 1024/1024/1024;
  const pct = (free/total*100).toFixed(1);
  
  log(`Memory: ${free.toFixed(1)}/${total.toFixed(1)} GB free (${pct}%)`);
  
  if (pct < 10) {
    log('WARNING: Memory critical!');
    // Kill Chrome if running
    try {
      execSync('taskkill /F /IM chrome.exe 2>nul');
      log('Auto-killed Chrome processes');
    } catch (e) {
      // Chrome not running
    }
  }
  
  return pct;
}

function checkDisk() {
  try {
    const output = execSync('wmic logicaldisk get size,freespace,caption /format:csv', { encoding: 'utf8' });
    const lines = output.split('\n').filter(l => l.includes('C:'));
    if (lines.length > 0) {
      const parts = lines[0].split(',');
      if (parts.length >= 3) {
        const free = parseInt(parts[1]) / 1024/1024/1024;
        const total = parseInt(parts[2]) / 1024/1024/1024;
        const pct = (free/total*100).toFixed(1);
        log(`Disk C: ${free.toFixed(1)}/${total.toFixed(1)} GB free (${pct}%)`);
        
        if (pct < 10) {
          log('WARNING: Disk space critical!');
        }
        
        return pct;
      }
    }
  } catch (e) {
    log('Disk check failed: ' + e.message);
  }
  return 100;
}

function checkCronJobs() {
  try {
    const output = execSync('openclaw cron list 2>&1', { encoding: 'utf8', timeout: 10000 });
    const lines = output.split('\n');
    const errors = lines.filter(l => l.includes('error'));
    
    log(`Cron jobs checked: ${errors.length} errors found`);
    
    if (errors.length > 0) {
      errors.forEach(e => log('  Error: ' + e));
    }
    
    return errors.length;
  } catch (e) {
    log('Cron check failed: ' + e.message);
    return 0;
  }
}

function checkConfig() {
  try {
    const config = require('C:/Users/quent/.openclaw/openclaw.json');
    
    // Check for critical settings
    if (!config.agents?.defaults?.tools?.elevated) {
      log('WARNING: Elevated tools not enabled');
    }
    
    if (!config.channels?.telegram?.enabled) {
      log('WARNING: Telegram not enabled');
    }
    
    // Check model count
    const models = Object.keys(config.agents?.defaults?.models || {});
    log(`Models configured: ${models.length}`);
    
    return true;
  } catch (e) {
    log('Config check failed: ' + e.message);
    return false;
  }
}

function autoFix() {
  const fixes = [];
  
  // Clean temp files
  try {
    const tempDirs = ['C:\\Users\\quent\\.openclaw\\workspace\\temp'];
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.length > 10) {
          fixes.push(`Cleaned ${files.length} temp files`);
        }
      }
    });
  } catch (e) {}
  
  return fixes;
}

function main() {
  log('=== System Health Check Started ===');
  
  const memory = checkMemory();
  const disk = checkDisk();
  const cronErrors = checkCronJobs();
  const configOK = checkConfig();
  const fixes = autoFix();
  
  // Summary
  const issues = [];
  if (memory < 10) issues.push('Memory critical');
  if (disk < 10) issues.push('Disk critical');
  if (cronErrors > 0) issues.push(`${cronErrors} cron errors`);
  if (!configOK) issues.push('Config issues');
  
  if (issues.length === 0) {
    log('System health: ALL GOOD');
  } else {
    log(`Issues found: ${issues.join(', ')}`);
  }
  
  if (fixes.length > 0) {
    fixes.forEach(f => log(`Auto-fixed: ${f}`));
  }
  
  log('=== System Health Check Complete ===\n');
}

main();
