/**
 * 🤖 CLAW A+ AUTONOMY ENGINE — LIGHTWEIGHT VERSION
 * 
 * Designed to run IN-BACKGROUND without spawning heavy processes.
 * Integrates into existing cron jobs and orchestrator.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  ram_warning: 90,
  ram_critical: 93,
  ram_emergency: 97,
  log_dir: path.join(__dirname, '..', 'logs'),
  dashboard_file: path.join(__dirname, '..', 'dashboard', 'self_monitor.html')
};

// ─── STATE ──────────────────────────────────────────────────
const state = {
  ram_pct: 0,
  status: 'OK',
  last_check: null,
  paused: false
};

// ─── CHECK RAM ──────────────────────────────────────────────
function checkRAM() {
  const total = os.totalmem();
  const free = os.freemem();
  const pct = Math.round(((total - free) / total) * 100);
  
  state.ram_pct = pct;
  state.last_check = new Date().toISOString();
  
  if (pct >= CONFIG.ram_emergency) return 'EMERGENCY';
  if (pct >= CONFIG.ram_critical) return 'CRITICAL';
  if (pct >= CONFIG.ram_warning) return 'WARNING';
  return 'OK';
}

// ─── RAM GUARD — Returns true if can proceed ────────────────
function ramGuard() {
  const status = checkRAM();
  state.status = status;
  
  if (status === 'EMERGENCY') {
    logEvent('RAM_EMERGENCY', { pct: state.ram_pct });
    state.paused = true;
    return false;
  }
  
  if (status === 'CRITICAL') {
    logEvent('RAM_CRITICAL', { pct: state.ram_pct });
    cleanup();
    return false; // Pause this operation
  }
  
  if (status === 'WARNING') {
    cleanup();
  }
  
  state.paused = false;
  return true;
}

// ─── LIGHTWEIGHT CLEANUP ────────────────────────────────────
function cleanup() {
  try {
    Object.keys(require.cache).forEach(key => {
      if (key.includes('node_modules') && !key.includes('openclaw')) {
        delete require.cache[key];
      }
    });
  } catch(e) {}
}

// ─── LOG ──────────────────────────────────────────────────
function logEvent(event, data) {
  try {
    const entry = `[${new Date().toISOString()}] ${event}: ${JSON.stringify(data)}\n`;
    fs.mkdirSync(CONFIG.log_dir, { recursive: true });
    fs.appendFileSync(path.join(CONFIG.log_dir, 'autonomy.log'), entry);
  } catch(e) {}
}

// ─── DASHBOARD — Write HTML ─────────────────────────────────
function updateDashboard() {
  try {
    const html = `
<!DOCTYPE html>
<html><head><title>Claw Monitor</title>
<style>
body{font-family:monospace;background:#0a0a0a;color:#0f0;padding:20px}
.status{font-size:36px;color:${state.status==='OK'?'#0f0':state.status==='WARNING'?'#ff0':'#f00'}}
.metric{background:#1a1a1a;padding:10px;margin:5px 0}
</style></head><body>
<h1>🤖 Claw A+ Monitor</h1>
<div class="status">${state.status} — RAM ${state.ram_pct}%</div>
<div class="metric">Uptime: ${Math.floor(os.uptime()/3600)}h</div>
<div class="metric">Status: ${state.paused ? 'PAUSED' : 'ACTIVE'}</div>
<div class="metric">Last Check: ${state.last_check}</div>
<script>setTimeout(()=>location.reload(),30000)</script>
</body></html>`;
    fs.mkdirSync(path.dirname(CONFIG.dashboard_file), { recursive: true });
    fs.writeFileSync(CONFIG.dashboard_file, html);
  } catch(e) {}
}

// ─── DECISION LOG ───────────────────────────────────────────
function logDecision(action, reasoning) {
  try {
    const entry = `[${new Date().toISOString()}] ${action} | ${reasoning}\n`;
    fs.appendFileSync(path.join(CONFIG.log_dir, 'decisions.log'), entry);
  } catch(e) {}
}

// ─── MAIN EXPORT ───────────────────────────────────────────
module.exports = {
  ramGuard,
  checkRAM,
  cleanup,
  updateDashboard,
  logDecision,
  logEvent,
  state,
  CONFIG
};

// ─── DIRECT RUN ───────────────────────────────────────────
if (require.main === module) {
  console.log('🛡️ RAM Guard check:', checkRAM() + '%');
  console.log('Can proceed:', ramGuard());
  updateDashboard();
  console.log('Dashboard:', CONFIG.dashboard_file);
}
