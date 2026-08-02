/**
 * PROJECT CLAW CORE — Reasoning Engine
 * Simple rule-based reasoning over facts.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'reasoning_engine.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ReasoningEngine {
  constructor() {
    this.rules = [];
  }
  
  addRule(name, condition, conclusion, priority = 1) {
    log(`Adding rule: ${name}`);
    this.rules.push({ name, condition, conclusion, priority });
  }
  
  reason(facts) {
    log('Running reasoning');
    const conclusions = [];
    for (const rule of this.rules) {
      if (rule.condition(facts)) {
        conclusions.push({ rule: rule.name, conclusion: rule.conclusion, priority: rule.priority });
      }
    }
    return { success: true, conclusions: conclusions.sort((a, b) => b.priority - a.priority) };
  }
  
  // Built-in example rules
  addDefaults() {
    this.addRule('high_ram', f => f.ram > 90, 'Trigger RAM cleanup', 5);
    this.addRule('low_disk', f => f.disk < 5, 'Free disk space', 5);
    this.addRule('market_crash', f => f.btc_drop > 10, 'Pause new trades', 4);
  }
}

module.exports = { ReasoningEngine };

if (require.main === module) {
  const engine = new ReasoningEngine();
  engine.addDefaults();
  const result = engine.reason({ ram: 92, disk: 20 });
  console.log(JSON.stringify(result, null, 2));
}
