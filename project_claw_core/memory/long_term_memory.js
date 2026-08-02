const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'memory', 'brain.db');

class LongTermMemory {
  constructor() {
    this.facts = new Map();
  }
  store(key, value) {
    this.facts.set(key, { value, created: new Date().toISOString() });
  }
  retrieve(key) {
    return this.facts.get(key);
  }
  search(query) {
    return Array.from(this.facts.entries()).filter(([k]) => k.includes(query));
  }
}

module.exports = { LongTermMemory };