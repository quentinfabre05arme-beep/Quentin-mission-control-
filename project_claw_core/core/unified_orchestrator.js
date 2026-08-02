/**
 * PROJECT CLAW CORE — Unified Orchestrator v3.0
 * Central controller that can invoke any capability by name.
 */

const fs = require('fs');
const path = require('path');
const { CapabilityInvoker } = require('./capability_invoker');
const { CapabilityRegistry } = require('./capability_registry');
const { SystemHealthMonitor } = require('./system_health_monitor');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'unified_orchestrator.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class UnifiedOrchestrator {
  constructor() {
    this.invoker = new CapabilityInvoker();
    this.registry = new CapabilityRegistry();
    this.health = new SystemHealthMonitor();
  }
  
  status() {
    const reg = this.registry.build();
    const health = this.health.getHealth();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      capabilities_total: reg.count,
      categories: Object.keys(reg.by_category),
      health: {
        ram_used_percent: health.memory.used_percent,
        disk_c_used_percent: health.disk.find(d => d.drive === 'C:')?.used_percent
      }
    };
  }
  
  async runCommand(command) {
    log(`Run command: ${command}`);
    if (typeof command !== 'string') return { success: false, error: 'command must be string' };
    const parts = command.split(' ');
    const capability = parts[0];
    const method = parts[1] || 'run';
    const args = parts.slice(2).map(a => {
      if (a === 'true') return true;
      if (a === 'false') return false;
      if (!isNaN(Number(a))) return Number(a);
      return a;
    });
    return await this.invoker.invoke(capability, method, args);
  }
  
  async healthCheck() {
    const h = this.health.getHealth();
    const issues = [];
    if (parseFloat(h.memory.used_percent) > 92) issues.push('RAM critical');
    if (parseFloat(h.disk.find(d => d.drive === 'C:')?.used_percent) > 90) issues.push('Disk C critical');
    return { success: true, healthy: issues.length === 0, issues, health: h };
  }
}

module.exports = { UnifiedOrchestrator };

if (require.main === module) {
  (async () => {
    const orch = new UnifiedOrchestrator();
    console.log(JSON.stringify(orch.status(), null, 2));
    const r = await orch.runCommand('system_health_monitor getHealth');
    console.log(JSON.stringify(r.result.memory, null, 2));
  })();
}
