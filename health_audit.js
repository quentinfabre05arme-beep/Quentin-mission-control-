const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const BASE = 'C:\\Users\\quent\\.openclaw';
const REPORT = [];

function log(s) {
  REPORT.push(s);
  console.log(s);
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: 'pipe' }).trim();
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

function exists(p) {
  return fs.existsSync(path.join(BASE, p));
}

function getSize(p) {
  try {
    const stat = fs.statSync(p);
    return stat.size;
  } catch {
    return 0;
  }
}

log('=== OPENCLAW HEALTH AUDIT ===');
log(`Date: ${new Date().toISOString()}`);
log(`OS: ${os.type()} ${os.release()} ${os.arch()}`);
log(`Node: ${process.version}`);
log(`User: ${os.userInfo().username}`);
log('');

// 1. Check OpenClaw processes
log('=== PROCESSES ===');
const procs = run('tasklist /FO CSV /FI "IMAGENAME eq node.exe" /NH');
if (procs.includes('node.exe')) {
  const lines = procs.split('\n').filter(l => l.includes('node.exe'));
  log(`✅ ${lines.length} Node processes running`);
  lines.forEach(l => {
    const parts = l.split(',');
    if (parts.length >= 2) {
      log(`  PID: ${parts[1].replace(/"/g, '')} | Memory: ${parts[4] || '?'}`);
    }
  });
} else {
  log('❌ No Node.js processes found');
}
log('');

// 2. Check critical files
log('=== CRITICAL FILES ===');
const criticalFiles = [
  'openclaw.json',
  'gateway.cmd',
  'gateway.vbs',
  'state/openclaw.sqlite'
];

criticalFiles.forEach(f => {
  const fullPath = path.join(BASE, f);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    const age = Math.floor((Date.now() - stat.mtime) / (1000 * 60 * 60 * 24));
    log(`✅ ${f} (${sizeMB} MB, ${age} days old)`);
  } else {
    log(`❌ MISSING: ${f}`);
  }
});
log('');

// 3. Check config file
log('=== CONFIG HEALTH ===');
const configPath = path.join(BASE, 'openclaw.json');
if (fs.existsSync(configPath)) {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    
    log(`✅ Config file is valid JSON`);
    log(`  Models: ${(config.models || []).length}`);
    log(`  Cron jobs: ${(config.cron?.jobs || []).length}`);
    log(`  Skills: ${(config.skills || []).length}`);
    
    // Check for API keys in plaintext
    const configStr = JSON.stringify(config);
    const hasKeys = configStr.includes('apiKey') || configStr.includes('token') || configStr.includes('secret');
    if (hasKeys) {
      log(`⚠️  Config contains API keys/tokens (should use SecretRefs)`);
    }
  } catch (e) {
    log(`❌ Config file is INVALID JSON: ${e.message}`);
  }
} else {
  log('❌ Config file not found');
}
log('');

// 4. Check disk space
log('=== DISK SPACE ===');
try {
  const wmic = run('wmic logicaldisk get size,freespace,caption /format:csv');
  const lines = wmic.split('\n').filter(l => l.includes('C:'));
  if (lines.length > 0) {
    const parts = lines[0].split(',');
    if (parts.length >= 3) {
      const free = parseInt(parts[1]) / 1024 / 1024 / 1024;
      const total = parseInt(parts[2]) / 1024 / 1024 / 1024;
      const used = total - free;
      const pct = (used / total * 100).toFixed(1);
      log(`C: Drive: ${used.toFixed(1)} / ${total.toFixed(1)} GB used (${pct}%)`);
      if (pct > 90) log('🔴 CRITICAL: Disk nearly full!');
      else if (pct > 80) log('🟡 WARNING: Disk getting full');
      else log('✅ Disk space OK');
    }
  }
} catch (e) {
  log(`⚠️  Could not get disk info: ${e.message}`);
}
log('');

// 5. Check workspace health
log('=== WORKSPACE HEALTH ===');
const workspacePath = path.join(BASE, 'workspace');
if (fs.existsSync(workspacePath)) {
  const items = fs.readdirSync(workspacePath);
  log(`✅ Workspace exists (${items.length} items)`);
  
  // Check for git repo
  if (fs.existsSync(path.join(workspacePath, '.git'))) {
    log('✅ Git repository found');
    
    // Check git status
    try {
      process.chdir(workspacePath);
      const status = run('git status --short');
      if (status) {
        const lines = status.split('\n').filter(l => l.trim());
        log(`⚠️  ${lines.length} uncommitted changes`);
      } else {
        log('✅ Working tree clean');
      }
    } catch (e) {
      log(`⚠️  Git check failed: ${e.message}`);
    }
  } else {
    log('❌ No Git repository');
  }
  
  // Check for important files
  const importantFiles = ['AGENTS.md', 'SOUL.md', 'USER.md', 'MEMORY.md', 'TOOLS.md'];
  importantFiles.forEach(f => {
    if (fs.existsSync(path.join(workspacePath, f))) {
      log(`✅ ${f} exists`);
    } else {
      log(`❌ Missing: ${f}`);
    }
  });
} else {
  log('❌ Workspace not found');
}
log('');

// 6. Check logs for errors
log('=== RECENT ERRORS ===');
const logsPath = path.join(BASE, 'logs');
if (fs.existsSync(logsPath)) {
  const logFiles = fs.readdirSync(logsPath)
    .filter(f => f.endsWith('.log'))
    .map(f => ({
      name: f,
      path: path.join(logsPath, f),
      mtime: fs.statSync(path.join(logsPath, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 3);
  
  logFiles.forEach(f => {
    const age = Math.floor((Date.now() - f.mtime) / (1000 * 60 * 60));
    log(`${f.name} (${age}h ago)`);
    
    // Check for errors
    try {
      const content = fs.readFileSync(f.path, 'utf8');
      const lines = content.split('\n');
      const errors = lines.filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail'));
      if (errors.length > 0) {
        log(`  ⚠️  ${errors.length} errors found`);
        errors.slice(0, 3).forEach(e => log(`    ${e.substring(0, 100)}`));
      } else {
        log('  ✅ No errors');
      }
    } catch (e) {
      log(`  ⚠️  Could not read: ${e.message}`);
    }
  });
} else {
  log('⚠️  No logs directory');
}
log('');

// 7. Check memory usage
log('=== MEMORY ===');
const totalMem = os.totalmem() / 1024 / 1024 / 1024;
const freeMem = os.freemem() / 1024 / 1024 / 1024;
const usedMem = totalMem - freeMem;
const memPct = (usedMem / totalMem * 100).toFixed(1);
log(`Total: ${totalMem.toFixed(1)} GB | Used: ${usedMem.toFixed(1)} GB (${memPct}%) | Free: ${freeMem.toFixed(1)} GB`);
if (memPct > 90) log('🔴 CRITICAL: Memory nearly exhausted!');
else if (memPct > 80) log('🟡 WARNING: High memory usage');
else log('✅ Memory OK');
log('');

// 8. Check for zombie processes
log('=== ZOMBIE PROCESSES ===');
try {
  const tasklist = run('tasklist /FO CSV /NH');
  const lines = tasklist.split('\n').filter(l => l.includes('node.exe') || l.includes('python'));
  if (lines.length > 5) {
    log(`⚠️  ${lines.length} Node/Python processes (possible zombies)`);
  } else {
    log('✅ Process count normal');
  }
} catch (e) {
  log(`⚠️  Could not check processes`);
}
log('');

// 9. Security check
log('=== SECURITY ===');
const envFiles = ['.env', '.env.local', '.env.printify'];
envFiles.forEach(f => {
  const envPath = path.join(workspacePath, f);
  if (fs.existsSync(envPath)) {
    const stat = fs.statSync(envPath);
    const perms = stat.mode;
    log(`⚠️  ${f} found (${(stat.size / 1024).toFixed(1)} KB)`);
  }
});
log('');

// 10. Summary
log('=== SUMMARY ===');
const errorCount = REPORT.filter(l => l.includes('❌')).length;
const warnCount = REPORT.filter(l => l.includes('⚠️') || l.includes('🟡')).length;
const okCount = REPORT.filter(l => l.includes('✅')).length;
log(`Errors: ${errorCount} | Warnings: ${warnCount} | OK: ${okCount}`);

if (errorCount === 0 && warnCount === 0) {
  log('🟢 SYSTEM HEALTHY');
} else if (errorCount === 0) {
  log('🟡 SYSTEM OK (with warnings)');
} else {
  log('🔴 SYSTEM NEEDS ATTENTION');
}

// Save report
const reportPath = path.join(BASE, 'workspace', 'HEALTH_AUDIT.txt');
fs.writeFileSync(reportPath, REPORT.join('\n'));
console.log(`\nReport saved to: ${reportPath}`);
