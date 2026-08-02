/**
 * PROJECT CLAW CORE — Business Intelligence
 * Aggregate metrics from multiple sources into a report.
 */

const fs = require('fs');
const path = require('path');
const { SystemHealthMonitor } = require('../core/system_health_monitor');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'business_intelligence.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class BusinessIntelligence {
  constructor() {
    this.monitor = new SystemHealthMonitor();
  }
  
  generateDashboardReport() {
    log('Generating BI report');
    const health = this.monitor.getHealth();
    
    return {
      timestamp: new Date().toISOString(),
      system: {
        ram_used_percent: parseFloat(health.memory.used_percent),
        disk_c_used_percent: health.disk.find(d => d.drive === 'C:')?.used_percent,
        uptime_hours: Math.round(health.uptime_seconds / 3600)
      },
      project: {
        // Count files in workspace
        js_files: this.countFiles('project_claw_core', '.js'),
        docs: this.countFiles('project_claw_core/docs', '.md')
      },
      status: health.memory.used_percent > 90 || health.disk.find(d => d.drive === 'C:')?.used_percent > 90 ? 'critical' : 'healthy'
    };
  }
  
  countFiles(dir, ext) {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    function walk(d) {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(ext)) count++;
      }
    }
    walk(dir);
    return count;
  }
}

module.exports = { BusinessIntelligence };

if (require.main === module) {
  const bi = new BusinessIntelligence();
  console.log(JSON.stringify(bi.generateDashboardReport(), null, 2));
}
