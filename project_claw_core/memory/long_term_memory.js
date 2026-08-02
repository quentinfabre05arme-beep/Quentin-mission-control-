/**
 * PROJECT CLAW CORE — Long-Term Memory v2
 * SQLite-based structured memory with vector search fallback.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'long_term_memory.log');
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'claw_memory.sqlite');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function loadDb() {
  try {
    return require('better-sqlite3')(DB_PATH);
  } catch(e) {
    throw new Error('better-sqlite3 not installed. Run: npm install better-sqlite3');
  }
}

class LongTermMemory {
  constructor() {
    fs.mkdirSync(DB_DIR, { recursive: true });
    this.db = loadDb();
    this.initTables();
  }
  
  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        key TEXT UNIQUE,
        value TEXT,
        importance REAL DEFAULT 0.5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
      CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
    `);
    log('Memory tables initialized');
  }
  
  set(category, key, value, importance = 0.5) {
    log(`Set memory: ${category}/${key}`);
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const stmt = this.db.prepare(`
      INSERT INTO memories (category, key, value, importance, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        category=excluded.category,
        value=excluded.value,
        importance=excluded.importance,
        updated_at=CURRENT_TIMESTAMP
    `);
    stmt.run(category, key, valueStr, importance);
    return { success: true };
  }
  
  get(key) {
    log(`Get memory: ${key}`);
    const stmt = this.db.prepare('SELECT * FROM memories WHERE key = ?');
    const row = stmt.get(key);
    if (!row) return null;
    return this.parseRow(row);
  }
  
  getByCategory(category, limit = 20) {
    log(`Get category: ${category}`);
    const stmt = this.db.prepare('SELECT * FROM memories WHERE category = ? ORDER BY updated_at DESC LIMIT ?');
    return stmt.all(category, limit).map(r => this.parseRow(r));
  }
  
  search(query, limit = 10) {
    log(`Search memory: ${query}`);
    const like = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      WHERE key LIKE ? OR value LIKE ?
      ORDER BY importance DESC, updated_at DESC
      LIMIT ?
    `);
    return stmt.all(like, like, limit).map(r => this.parseRow(r));
  }
  
  parseRow(row) {
    let value = row.value;
    try { value = JSON.parse(value); } catch(e) {}
    return { ...row, value };
  }
  
  close() {
    this.db.close();
  }
}

module.exports = { LongTermMemory };

if (require.main === module) {
  const mem = new LongTermMemory();
  mem.set('connections', 'microsoft_outlook', { status: 'connected', method: 'browser', date: new Date().toISOString() }, 0.9);
  const result = mem.get('microsoft_outlook');
  console.log(JSON.stringify(result, null, 2));
  mem.close();
}
