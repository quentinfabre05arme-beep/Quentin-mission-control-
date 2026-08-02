#!/usr/bin/env node
/**
 * 🗄️ SQLITE BRAIN ENGINE
 * Structured data, fast queries, local database
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'brain.sqlite');

// ─── CHECK SQLITE AVAILABLE ───────────────────────────────
function hasSQLite() {
  try {
    require('sqlite3');
    return true;
  } catch(e) {
    return false;
  }
}

// ─── FALLBACK: JSON-BASED SQL-LIKE ────────────────────────
class JSONBrain {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'json_brain');
    fs.mkdirSync(this.dataDir, { recursive: true });
    this.tables = {};
    this.loadAll();
  }
  
  loadAll() {
    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    files.forEach(f => {
      const table = f.replace('.json', '');
      this.tables[table] = JSON.parse(fs.readFileSync(path.join(this.dataDir, f), 'utf8'));
    });
  }
  
  createTable(name, schema = {}) {
    if (!this.tables[name]) {
      this.tables[name] = { schema, rows: [], id: 0 };
      this.save(name);
    }
    return this;
  }
  
  insert(table, data) {
    if (!this.tables[table]) this.createTable(table);
    const row = { ...data, _id: ++this.tables[table].id, _created: new Date().toISOString() };
    this.tables[table].rows.push(row);
    this.save(table);
    return row._id;
  }
  
  select(table, where = null, limit = 100) {
    if (!this.tables[table]) return [];
    let rows = this.tables[table].rows;
    if (where) {
      rows = rows.filter(r => {
        return Object.entries(where).every(([k, v]) => r[k] === v);
      });
    }
    return rows.slice(0, limit);
  }
  
  update(table, id, data) {
    if (!this.tables[table]) return 0;
    const idx = this.tables[table].rows.findIndex(r => r._id === id);
    if (idx >= 0) {
      this.tables[table].rows[idx] = { ...this.tables[table].rows[idx], ...data, _updated: new Date().toISOString() };
      this.save(table);
      return 1;
    }
    return 0;
  }
  
  delete(table, id) {
    if (!this.tables[table]) return 0;
    const before = this.tables[table].rows.length;
    this.tables[table].rows = this.tables[table].rows.filter(r => r._id !== id);
    this.save(table);
    return before - this.tables[table].rows.length;
  }
  
  query(sql) {
    // Simple SQL-like parser
    const lower = sql.toLowerCase().trim();
    if (lower.startsWith('select')) {
      const match = lower.match(/select\s+(.+)\s+from\s+(\w+)/i);
      if (match) {
        const [, fields, table] = match;
        const rows = this.select(table);
        if (fields.trim() === '*') return rows;
        return rows.map(r => {
          const obj = {};
          fields.split(',').forEach(f => obj[f.trim()] = r[f.trim()]);
          return obj;
        });
      }
    }
    return { error: 'Query not supported', sql };
  }
  
  save(table) {
    fs.writeFileSync(
      path.join(this.dataDir, `${table}.json`),
      JSON.stringify(this.tables[table], null, 2)
    );
  }
  
  stats() {
    return Object.entries(this.tables).map(([name, t]) => ({
      table: name,
      rows: t.rows.length,
      lastId: t.id
    }));
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { JSONBrain, hasSQLite };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🗄️ SQLite Brain Engine (JSON fallback)');
  console.log('SQLite available:', hasSQLite() ? '✅' : '❌ Using JSON');
  console.log('');
  
  const brain = new JSONBrain();
  
  console.log('Creating tables...');
  brain.createTable('decisions', { ticker: 'string', action: 'string', score: 'number' });
  brain.createTable('market_data', { asset: 'string', price: 'number', timestamp: 'string' });
  
  console.log('Inserting test data...');
  brain.insert('decisions', { ticker: 'BTC', action: 'HOLD', score: 0.5, reasoning: 'Fear at 27' });
  brain.insert('decisions', { ticker: 'ETH', action: 'BUY', score: 1.2, reasoning: 'Oversold' });
  brain.insert('market_data', { asset: 'BTC', price: 63000, timestamp: new Date().toISOString() });
  
  console.log('Querying...');
  const results = brain.select('decisions', { action: 'BUY' });
  console.log('BUY decisions:', results.length);
  results.forEach(r => console.log('  -', r.ticker, r.reasoning));
  
  console.log('');
  console.log('SQL query:');
  const sql = brain.query('SELECT ticker, action FROM decisions');
  console.log(sql);
  
  console.log('');
  console.log('Stats:', brain.stats());
  console.log('');
  console.log('SQLite brain ready');
}
