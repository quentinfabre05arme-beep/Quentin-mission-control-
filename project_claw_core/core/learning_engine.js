const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'learning_engine.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class LearningEngine {
  constructor() {
    this.decisions = [];
  }
  logDecision(decision, outcome) {
    this.decisions.push({ decision, outcome, time: new Date().toISOString() });
    log('Decision logged');
  }
  accuracy() {
    const total = this.decisions.length;
    const good = this.decisions.filter(d => d.outcome === 'success').length;
    return total ? good / total : 0;
  }
}

module.exports = { LearningEngine };