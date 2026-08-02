/**
 * PROJECT CLAW CORE — Long-Term Memory v2
 * Pure JavaScript JSON-based memory (no native dependencies).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'long_term_memory.log');
const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'claw_memory.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class LongTermMemory {
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.data = this.load();
  }
  
  load() {
    if (fs.existsSync(MEMORY_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      } catch(e) {
        log('Failed to load memory file: ' + e.message);
      }
    }
    return { memories: {}, categories: {} };
  }
  
  save() {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.data, null, 2));
  }
  
  set(category, key, value, importance = 0.5) {
    log(`Set memory: ${category}/${key}`);
    this.data.memories[key] = {
      category,
      value,
      importance,
      created_at: this.data.memories[key]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.save();
    return { success: true };
  }
  
  get(key) {
    log(`Get memory: ${key}`);
    return this.data.memories[key] || null;
  }
  
  getByCategory(category, limit = 20) {
    log(`Get category: ${category}`);
    return Object.values(this.data.memories)
      .filter(m => m.category === category)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, limit);
  }
  
  search(query, limit = 10) {
    log(`Search memory: ${query}`);
    const q = query.toLowerCase();
    return Object.entries(this.data.memories)
      .filter(([key, m]) => {
        const valueStr = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
        return key.toLowerCase().includes(q) || valueStr.toLowerCase().includes(q);
      })
      .map(([key, m]) => ({ key, ...m }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }
  
  listCategories() {
    const cats = new Set(Object.values(this.data.memories).map(m => m.category));
    return Array.from(cats);
  }
}

module.exports = { LongTermMemory };

if (require.main === module) {
  const mem = new LongTermMemory();
  mem.set('connections', 'microsoft_outlook', { status: 'connected', method: 'browser', date: new Date().toISOString() }, 0.9);
  const result = mem.get('microsoft_outlook');
  console.log(JSON.stringify(result, null, 2));
  console.log('Search:', mem.search('microsoft'));
}
