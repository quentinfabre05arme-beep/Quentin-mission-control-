/**
 * PROJECT CLAW CORE — SQLite Brain
 * Structured memory in SQLite.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'sqlite_brain.log');
const DB_FILE = path.join(__dirname, '..', 'data', 'brain.sqlite');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class SQLiteBrain {
  constructor(dbPath = DB_FILE) {
    this.dbPath = dbPath;
    this.db = null;
    this._tryConnect();
  }
  
  _tryConnect() {
    try {
      const sqlite3 = require('sqlite3').verbose();
      this.db = new sqlite3.Database(this.dbPath);
      this.db.serialize(() => {
        this.db.run('CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT, created_at TEXT)');
      });
      log('SQLite brain connected');
    } catch(e) {
      this.db = null;
      log(`SQLite not available: ${e.message}`);
    }
  }
  
  set(key, value) {
    log(`Set ${key}`);
    if (!this.db) return { success: false, error: 'sqlite3 not installed' };
    return new Promise((resolve, reject) => {
      this.db.run(
        'CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT, created_at TEXT)',
        [],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          this.db.run(
            'INSERT OR REPLACE INTO memories (key, value, created_at) VALUES (?, ?, ?)',
            [key, JSON.stringify(value), new Date().toISOString()],
            function(err2) {
              if (err2) reject(err2);
              else resolve({ success: true, key });
            }
          );
        }
      );
    });
  }
  
  get(key) {
    log(`Get ${key}`);
    if (!this.db) return Promise.resolve({ success: false, error: 'sqlite3 not installed' });
    return new Promise((resolve) => {
      this.db.get('SELECT value FROM memories WHERE key = ?', [key], (err, row) => {
        if (err || !row) resolve({ success: false, error: err?.message || 'not found' });
        else resolve({ success: true, key, value: JSON.parse(row.value) });
      });
    });
  }
}

module.exports = { SQLiteBrain };

if (require.main === module) {
  const brain = new SQLiteBrain();
  if (brain.db) {
    brain.set('test', { hello: 'world' }).then(r => {
      console.log(JSON.stringify(r, null, 2));
      return brain.get('test');
    }).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e.message));
  } else {
    console.log(JSON.stringify({ sqlite3: false, note: 'sqlite3 not installed' }, null, 2));
  }
}
