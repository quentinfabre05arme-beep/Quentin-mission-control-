/**
 * PROJECT CLAW CORE — Health Dashboard
 * Generates HTML dashboard from system health + project status.
 */

const fs = require('fs');
const path = require('path');
const { SystemHealthMonitor } = require('./system_health_monitor');

const OUTPUT_DIR = path.join(__dirname, '..', 'dashboard');

function generateDashboard(health) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Claw Core — Health Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 20px; }
    h1 { color: #00d4ff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
    .card { background: #151520; border: 1px solid #2a2a3a; border-radius: 12px; padding: 20px; }
    .card h2 { margin-top: 0; color: #7c3aed; }
    .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px; background: #1a1a2a; border-radius: 6px; }
    .ok { color: #22c55e; }
    .warn { color: #f59e0b; }
    .crit { color: #ef4444; }
    pre { background: #0f0f18; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🐾 Claw Core Health Dashboard</h1>
  <p>Last updated: ${health.timestamp}</p>
  
  <div class="grid">
    <div class="card">
      <h2>Memory</h2>
      <div class="metric"><span>Total</span><span>${health.memory.total_gb} GB</span></div>
      <div class="metric"><span>Used</span><span class="${parseFloat(health.memory.used_percent) > 90 ? 'crit' : parseFloat(health.memory.used_percent) > 80 ? 'warn' : 'ok'}">${health.memory.used_gb} GB (${health.memory.used_percent}%)</span></div>
      <div class="metric"><span>Free</span><span>${health.memory.free_gb} GB</span></div>
    </div>
    
    <div class="card">
      <h2>CPU</h2>
      <div class="metric"><span>Cores</span><span>${health.cpu.count}</span></div>
      <div class="metric"><span>Model</span><span>${health.cpu.model}</span></div>
      <div class="metric"><span>Uptime</span><span>${Math.round(health.uptime_seconds / 3600)}h</span></div>
    </div>
    
    <div class="card">
      <h2>Disk</h2>
      ${health.disk.map(d => `
        <div class="metric">
          <span>${d.drive || d.error}</span>
          <span class="${parseFloat(d.used_percent) > 90 ? 'crit' : parseFloat(d.used_percent) > 80 ? 'warn' : 'ok'}">${d.total_gb ? d.free_gb + ' GB free (' + d.used_percent + '%)' : 'error'}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="card">
      <h2>Top Processes</h2>
      <pre>${typeof health.processes === 'string' ? health.processes : JSON.stringify(health.processes, null, 2)}</pre>
    </div>
    
    <div class="card">
      <h2>Network Interfaces</h2>
      <pre>${JSON.stringify(health.network, null, 2)}</pre>
    </div>
  </div>
</body>
</html>`;
}

function updateDashboard() {
  const monitor = new SystemHealthMonitor();
  const health = monitor.getHealth();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const html = generateDashboard(health);
  const file = path.join(OUTPUT_DIR, 'health.html');
  fs.writeFileSync(file, html);
  return { success: true, path: file, health };
}

module.exports = { updateDashboard, generateDashboard };

if (require.main === module) {
  const result = updateDashboard();
  console.log(JSON.stringify(result, null, 2));
}
