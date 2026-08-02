/**
 * PROJECT CLAW CORE — Vector Brain
 * Simple vector memory using JSON (placeholder for embeddings).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'vector_brain.log');
const DB_FILE = path.join(__dirname, '..', 'data', 'vector_brain.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class VectorBrain {
  constructor() {
    this.db = this.load();
  }
  
  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch(e) {
        return { vectors: [] };
      }
    }
    return { vectors: [] };
  }
  
  save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2));
  }
  
  add(id, text, vector) {
    log(`Add vector: ${id}`);
    this.db.vectors.push({ id, text, vector, created_at: new Date().toISOString() });
    this.save();
    return { success: true, id };
  }
  
  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  search(queryVector, topK = 3) {
    log('Vector search');
    const results = this.db.vectors.map(v => ({
      id: v.id,
      text: v.text,
      score: this.cosineSimilarity(queryVector, v.vector)
    })).sort((a, b) => b.score - a.score).slice(0, topK);
    return { success: true, results };
  }
}

module.exports = { VectorBrain };

if (require.main === module) {
  const brain = new VectorBrain();
  brain.add('btc', 'Bitcoin crypto BTC', [1, 0.9, 0.8]);
  brain.add('eth', 'Ethereum smart contract', [0.9, 1, 0.7]);
  brain.add('aapl', 'Apple stock technology', [0.1, 0.2, 0.3]);
  console.log(JSON.stringify(brain.search([1, 0.9, 0.8], 2), null, 2));
}
