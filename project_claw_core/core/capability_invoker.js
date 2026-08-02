/**
 * PROJECT CLAW CORE — Capability Invoker
 * Invoke any capability by name with arguments.
 */

const fs = require('fs');
const path = require('path');
const { CapabilityRegistry } = require('./capability_registry');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'capability_invoker.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class CapabilityInvoker {
  constructor() {
    this.registry = new CapabilityRegistry();
    this.cache = {};
  }
  
  async invoke(capabilityName, methodName, args = []) {
    log(`Invoking ${capabilityName}.${methodName}(${args.length} args)`);
    const entry = this.registry.find(capabilityName);
    if (!entry) return { success: false, error: `Capability not found: ${capabilityName}` };
    
    try {
      if (!this.cache[entry.path]) {
        this.cache[entry.path] = require(entry.path);
      }
      const mod = this.cache[entry.path];
      const cls = mod[entry.class] || Object.values(mod).find(v => typeof v === 'function');
      if (!cls) return { success: false, error: 'No class found in module' };
      
      const instance = new cls();
      if (typeof instance[methodName] !== 'function') {
        return { success: false, error: `Method ${methodName} not found` };
      }
      const result = await instance[methodName](...args);
      return { success: true, result };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  list() {
    return this.registry.build();
  }
}

module.exports = { CapabilityInvoker };

if (require.main === module) {
  const invoker = new CapabilityInvoker();
  (async () => {
    const r = await invoker.invoke('system_health_monitor', 'getHealth');
    console.log(JSON.stringify({ ram: r.result.memory.used_percent }, null, 2));
  })();
}
