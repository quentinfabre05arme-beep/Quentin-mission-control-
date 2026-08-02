#!/usr/bin/env node
/**
 * 🧬 VECTOR BRAIN ENGINE
 * Semantic search with cosine similarity
 */

const fs = require('fs');
const path = require('path');

const BRAIN_FILE = path.join(__dirname, '..', 'data', 'vector_brain.json');

// ─── VECTOR BRAIN ─────────────────────────────────────────
class VectorBrain {
  constructor() {
    this.documents = [];
    this.load();
  }
  
  // Simple vectorization: word frequency
  vectorize(text) {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    return freq;
  }
  
  // Cosine similarity
  similarity(v1, v2) {
    const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
    let dot = 0, mag1 = 0, mag2 = 0;
    keys.forEach(k => {
      const a = v1[k] || 0;
      const b = v2[k] || 0;
      dot += a * b;
      mag1 += a * a;
      mag2 += b * b;
    });
    return mag1 && mag2 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
  }
  
  add(text, metadata = {}, category = 'general') {
    const doc = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
      text,
      vector: this.vectorize(text),
      metadata,
      category,
      timestamp: new Date().toISOString()
    };
    this.documents.push(doc);
    this.save();
    return doc.id;
  }
  
  search(query, limit = 5) {
    const qv = this.vectorize(query);
    return this.documents
      .map(d => ({
        id: d.id,
        text: d.text,
        category: d.category,
        metadata: d.metadata,
        timestamp: d.timestamp,
        score: this.similarity(qv, d.vector)
      }))
      .filter(d => d.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  byCategory(category) {
    return this.documents.filter(d => d.category === category);
  }
  
  load() {
    if (fs.existsSync(BRAIN_FILE)) {
      this.documents = JSON.parse(fs.readFileSync(BRAIN_FILE, 'utf8'));
    }
  }
  
  save() {
    fs.mkdirSync(path.dirname(BRAIN_FILE), { recursive: true });
    fs.writeFileSync(BRAIN_FILE, JSON.stringify(this.documents, null, 2));
  }
  
  stats() {
    const categories = {};
    this.documents.forEach(d => categories[d.category] = (categories[d.category] || 0) + 1);
    return { total: this.documents.length, categories };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { VectorBrain };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  const brain = new VectorBrain();
  
  console.log('🧬 Vector Brain Engine');
  console.log('Existing:', brain.stats());
  console.log('');
  
  // Seed knowledge
  brain.add('Alpha Fund v3.0 uses BTC ETH MSTR HIMS for paper trading', { source: 'config' }, 'trading');
  brain.add('Fear and Greed index at 27 means extreme fear and contrarian buy signal', { source: 'market' }, 'trading');
  brain.add('Gateway immortality engine restarts crashed processes automatically every 5 seconds', { source: 'system' }, 'infrastructure');
  brain.add('User Quentin granted full admin access on August 2 2026', { source: 'conversation' }, 'security');
  brain.add('POD business was erased and deleted from all configs', { source: 'action' }, 'business');
  brain.add('Execution loop runs every 10 minutes checking RAM goals and predictions', { source: 'system' }, 'infrastructure');
  
  console.log('Added 6 documents');
  console.log('Stats:', brain.stats());
  console.log('');
  
  // Search tests
  console.log('Search: "trading strategy"');
  brain.search('trading strategy').forEach((r, i) => {
    console.log(`${i+1}. [${r.category}] ${r.text.substring(0, 50)}... (score: ${r.score.toFixed(3)})`);
  });
  
  console.log('');
  console.log('Search: "gateway restart crash"');
  brain.search('gateway restart crash').forEach((r, i) => {
    console.log(`${i+1}. [${r.category}] ${r.text.substring(0, 50)}... (score: ${r.score.toFixed(3)})`);
  });
  
  console.log('');
  console.log('Search: "Quentin admin"');
  brain.search('Quentin admin').forEach((r, i) => {
    console.log(`${i+1}. [${r.category}] ${r.text.substring(0, 50)}... (score: ${r.score.toFixed(3)})`);
  });
}
