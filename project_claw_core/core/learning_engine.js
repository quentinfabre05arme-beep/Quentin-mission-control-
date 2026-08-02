/**
 * PROJECT CLAW CORE — Learning Engine
 * Track success/failure rates and learn simple preferences.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'learning_engine.log');
const MODEL_FILE = path.join(__dirname, '..', 'data', 'learning_model.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class LearningEngine {
  constructor() {
    this.model = this.load();
  }
  
  load() {
    if (fs.existsSync(MODEL_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
      } catch(e) {
        return {};
      }
    }
    return {};
  }
  
  save() {
    fs.mkdirSync(path.dirname(MODEL_FILE), { recursive: true });
    fs.writeFileSync(MODEL_FILE, JSON.stringify(this.model, null, 2));
  }
  
  recordOutcome(action, success, metadata = {}) {
    log(`Recording outcome: ${action} success=${success}`);
    if (!this.model[action]) this.model[action] = { attempts: 0, successes: 0, failures: 0, last: null };
    this.model[action].attempts++;
    if (success) this.model[action].successes++;
    else this.model[action].failures++;
    this.model[action].last = { ...metadata, timestamp: new Date().toISOString(), success };
    this.save();
    return this.model[action];
  }
  
  getSuccessRate(action) {
    const data = this.model[action];
    if (!data || data.attempts === 0) return null;
    return data.successes / data.attempts;
  }
  
  recommend(action) {
    const rate = this.getSuccessRate(action);
    if (rate === null) return { action, recommendation: 'unknown', rate: null };
    if (rate >= 0.8) return { action, recommendation: 'continue', rate };
    if (rate >= 0.5) return { action, recommendation: 'caution', rate };
    return { action, recommendation: 'avoid', rate };
  }
}

module.exports = { LearningEngine };

if (require.main === module) {
  const engine = new LearningEngine();
  engine.recordOutcome('ram_cleanup', true);
  engine.recordOutcome('ram_cleanup', true);
  engine.recordOutcome('ram_cleanup', false);
  console.log(JSON.stringify(engine.recommend('ram_cleanup'), null, 2));
}
