/**
 * PROJECT CLAW CORE — Predictive Maintenance
 * Detect issues before they cause failures: RAM, disk, cron, errors.
 */

const fs = require('fs');
const path = require('path');
const { SystemHealthMonitor } = require('./system_health_monitor');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'predictive_maintenance.log');
const ERROR_LOGS = [
  'alpha_fund_v3/logs/errors.log',
  'project_claw_core/logs/build_loop.log',
  'project_claw_core/logs/verifier.log'
];

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function tailLog(filePath, lines = 20) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf8').split('\n');
  return content.slice(-lines).join('\n');
}

function countErrors(text) {
  const errorKeywords = ['error', 'failed', 'exception', 'fatal', 'crash', 'timeout'];
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of errorKeywords) {
    const matches = lower.match(new RegExp(kw, 'g'));
    count += matches ? matches.length : 0;
  }
  return count;
}

class PredictiveMaintenance {
  constructor() {
    this.monitor = new SystemHealthMonitor();
  }
  
  runDiagnostics() {
    log('Running predictive diagnostics');
    const { health, alerts } = this.monitor.checkAlerts();
    
    const predictions = [];
    
    // RAM trend prediction
    if (parseFloat(health.memory.used_percent) > 85) {
      predictions.push({
        component: 'RAM',
        risk: 'high',
        prediction: 'System likely to slow or crash within 30 minutes if usage keeps climbing',
        action: 'Run RAM cleanup immediately'
      });
    }
    
    // Disk prediction
    for (const d of health.disk) {
      if (parseFloat(d.used_percent) > 85) {
        predictions.push({
          component: `Disk ${d.drive}`,
          risk: 'high',
          prediction: 'Disk will fill up soon',
          action: 'Run cleanup or move data'
        });
      }
    }
    
    // Error rate prediction
    let totalErrors = 0;
    for (const logFile of ERROR_LOGS) {
      const file = path.join(__dirname, '..', '..', logFile);
      const tail = tailLog(file, 50);
      totalErrors += countErrors(tail);
    }
    
    if (totalErrors > 20) {
      predictions.push({
        component: 'Error Logs',
        risk: 'medium',
        prediction: `${totalErrors} error keywords found in recent logs — instability rising`,
        action: 'Review logs and fix root causes'
      });
    }
    
    // Uptime / stale data
    if (health.uptime_seconds > 7 * 24 * 3600) {
      predictions.push({
        component: 'System',
        risk: 'low',
        prediction: 'System has been running over a week — reboot recommended for memory leaks',
        action: 'Schedule restart during downtime'
      });
    }
    
    return { health, alerts, predictions };
  }
  
  autoFix() {
    const diag = this.runDiagnostics();
    const actions = [];
    
    if (diag.predictions.some(p => p.component === 'RAM' && p.risk === 'high')) {
      try {
        const ramCleanup = path.join(__dirname, '..', '..', 'alpha_fund_v3', 'scripts', 'ram_cleanup.js');
        if (fs.existsSync(ramCleanup)) {
          require(ramCleanup);
          actions.push('RAM cleanup executed');
        }
      } catch(e) {
        actions.push('RAM cleanup failed: ' + e.message);
      }
    }
    
    return { ...diag, actions };
  }
  predict() {
    return this.autoFix();
  }
  
  run() {
    return this.autoFix();
  }
}

module.exports = { PredictiveMaintenance };

if (require.main === module) {
  const pm = new PredictiveMaintenance();
  const result = pm.autoFix();
  console.log(JSON.stringify(result, null, 2));
}
