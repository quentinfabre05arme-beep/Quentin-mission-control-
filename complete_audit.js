const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const REPORT = [];
function log(s) { REPORT.push(s); console.log(s); }

log('=== COMPLETE OPENCLAW AUDIT ===');
log('Date: ' + new Date().toISOString());
log('Node: ' + process.version);
log('');

// 1. Memory Analysis
log('=== MEMORY & PERFORMANCE ===');
const total = os.totalmem() / 1024/1024/1024;
const free = os.freemem() / 1024/1024/1024;
const used = total - free;
log('RAM: ' + used.toFixed(1) + '/' + total.toFixed(1) + ' GB (' + (used/total*100).toFixed(0) + '%)');
log('CPU cores: ' + os.cpus().length);
log('Uptime: ' + (os.uptime()/3600).toFixed(1) + 'h');
log('');

// 2. Config Analysis
log('=== CONFIG ANALYSIS ===');
const config = require('C:/Users/quent/.openclaw/openclaw.json');
log('Models: ' + Object.keys(config.agents?.defaults?.models || {}).length);
log('Primary: ' + (config.agents?.defaults?.model?.primary || 'none'));
const enabledSkills = Object.entries(config.skills?.entries || {}).filter(([k,v]) => v.enabled);
log('Skills enabled: ' + enabledSkills.length);
log('Cron jobs: ' + (config.cron?.jobs || []).length);
log('Telegram: ' + (config.channels?.telegram?.enabled ? 'YES' : 'NO'));
log('Elevated tools: ' + (config.agents?.defaults?.tools?.elevated ? 'YES' : 'NO'));
log('');

// 3. Workspace Analysis
log('=== WORKSPACE ANALYSIS ===');
const workspace = 'C:\\Users\\quent\\.openclaw\\workspace';
const items = fs.readdirSync(workspace);
log('Items: ' + items.length);

const critical = ['AGENTS.md','SOUL.md','USER.md','MEMORY.md','TOOLS.md','HEARTBEAT.md'];
critical.forEach(f => {
  const p = path.join(workspace, f);
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    const age = Math.floor((Date.now() - stat.mtime) / (1000*60*60*24));
    log('OK ' + f + ' (' + (stat.size/1024).toFixed(0) + ' KB, ' + age + 'd old)');
  } else {
    log('MISSING: ' + f);
  }
});
log('');

// 4. Mission Control
log('=== MISSION CONTROL ===');
const mc = path.join(workspace, 'mission_control');
if (fs.existsSync(mc)) {
  const mcItems = fs.readdirSync(mc);
  log('Files: ' + mcItems.length);
} else {
  log('mission_control not found');
}
log('');

// 5. Memory Files
log('=== MEMORY FILES ===');
const memDir = path.join(workspace, 'memory');
if (fs.existsSync(memDir)) {
  const memFiles = fs.readdirSync(memDir).filter(f => f.endsWith('.md'));
  log('Daily notes: ' + memFiles.length);
} else {
  log('memory/ directory not found');
}
log('');

// 6. Cron Analysis
log('=== CRON STATUS ===');
const cronPath = 'C:\\Users\\quent\\.openclaw\\cron\\jobs.json';
if (fs.existsSync(cronPath)) {
  const cron = JSON.parse(fs.readFileSync(cronPath, 'utf8'));
  log('Total jobs: ' + (cron.jobs?.length || 0));
} else {
  log('Cron jobs stored internally');
}
log('');

// 7. Git
log('=== GIT STATUS ===');
process.chdir(workspace);
try {
  const status = execSync('git status --short', { encoding: 'utf8' });
  const lines = status.split('\n').filter(l => l.trim());
  log('Uncommitted: ' + lines.length + ' files');
} catch(e) {
  log('Git check failed');
}
log('');

// 8. Recommendations
log('=== RECOMMENDATIONS ===');
log('1. MEMORY: Add daily cron to clear Chrome caches');
log('2. CONFIG: Enable more skills (obsidian, healthcheck, heartbeat-v2)');
log('3. AUTOMATION: Create self-improvement loop cron');
log('4. BACKUP: Add daily git auto-commit cron');
log('5. MONITORING: Create system health dashboard');
log('6. LEARNING: Add pattern extraction from daily notes');
log('7. SECURITY: Move API keys to SecretRefs');
log('8. EFFICIENCY: Compress old session logs monthly');

fs.writeFileSync('COMPLETE_AUDIT.txt', REPORT.join('\n'));
console.log('\nReport saved: COMPLETE_AUDIT.txt');
