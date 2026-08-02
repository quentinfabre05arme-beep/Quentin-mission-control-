#!/usr/bin/env node
/**
 * 🧠 LOCAL BRAIN ENGINE
 * Document storage + search + memory
 */

const fs = require('fs');
const path = require('path');

const BRAIN_FILE = path.join(__dirname, '..', 'data', 'brain.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'brain.log');

// ─── BRAIN ──────────────────────────────────────────────────
class Brain {
  constructor() {
    this.documents = [];
    this.load();
  }
  
  add(text, metadata = {}, category = 'general') {
    const doc = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
      text,
      metadata,
      category,
      timestamp: new Date().toISOString(),
      embeddings: null // For future vector search
    };
    this.documents.push(doc);
    this.save();
    this.log('ADD', { id: doc.id, category });
    return doc.id;
  }
  
  search(query, limit = 5) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    return this.documents
      .map(d => {
        const text = d.text.toLowerCase();
        const matches = terms.filter(t => text.includes(t)).length;
        const score = terms.length > 0 ? matches / terms.length : 0;
        return { ...d, score, match_count: matches };
      })
      .filter(d => d.score > 0 || d.text.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  getByCategory(category) {
    return this.documents.filter(d => d.category === category);
  }
  
  getRecent(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.documents
      .filter(d => new Date(d.timestamp).getTime() > cutoff)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  delete(id) {
    const before = this.documents.length;
    this.documents = this.documents.filter(d => d.id !== id);
    this.save();
    return before - this.documents.length;
  }
  
  stats() {
    const categories = {};
    this.documents.forEach(d => {
      categories[d.category] = (categories[d.category] || 0) + 1;
    });
    
    return {
      total: this.documents.length,
      categories,
      oldest: this.documents[0]?.timestamp,
      newest: this.documents[this.documents.length - 1]?.timestamp
    };
  }
  
  save() {
    fs.mkdirSync(path.dirname(BRAIN_FILE), { recursive: true });
    fs.writeFileSync(BRAIN_FILE, JSON.stringify(this.documents, null, 2));
  }
  
  load() {
    if (fs.existsSync(BRAIN_FILE)) {
      this.documents = JSON.parse(fs.readFileSync(BRAIN_FILE, 'utf8'));
    }
  }
  
  log(action, data) {
    const entry = `[${new Date().toISOString()}] ${action}: ${JSON.stringify(data)}\n`;
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, entry);
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { Brain };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  const brain = new Brain();
  
  console.log('🧠 Local Brain Engine');
  console.log('');
  console.log('Stats:', brain.stats());
  console.log('');
  
  // Add test knowledge
  brain.add('Alpha Fund uses BTC, ETH, MSTR, HIMS as primary assets', { source: 'config' }, 'trading');
  brain.add('Fear & Greed index below 25 indicates extreme fear and contrarian buy opportunities', { source: 'market' }, 'trading');
  brain.add('Gateway immortality checks every 5 seconds via PID 8404 daemon', { source: 'system' }, 'infrastructure');
  brain.add('User granted full admin access on August 2, 2026 at 13:10 CET', { source: 'conversation' }, 'security');
  
  console.log('Added 4 documents');
  console.log('');
  
  // Search
  console.log('Search: "trading assets"');
  brain.search('trading assets').forEach(r => {
    console.log(`  [${r.category}] ${r.text.substring(0, 60)}... (score: ${r.score.toFixed(2)})`);
  });
  
  console.log('');
  console.log('Recent documents:', brain.getRecent(1).length);
}
