/**
 * PROJECT CLAW CORE — Drive Indexer
 * Index drive contents for fast search.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'drive_indexer.log');
const INDEX_FILE = path.join(__dirname, '..', 'data', 'drive_index.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class DriveIndexer {
  constructor() {
    this.index = [];
  }
  
  indexDrive(drive, options = {}) {
    const maxDepth = options.maxDepth || 4;
    const maxFiles = options.maxFiles || 5000;
    log(`Indexing drive ${drive}`);
    this._walk(drive, 0, maxDepth, maxFiles);
    this.saveIndex();
    return { success: true, count: this.index.length };
  }
  
  _walk(dir, depth, maxDepth, maxFiles) {
    if (depth > maxDepth || this.index.length >= maxFiles) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.index.length >= maxFiles) break;
        if (entry.name.startsWith('$') || entry.name === 'System Volume Information') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this._walk(fullPath, depth + 1, maxDepth, maxFiles);
        } else {
          try {
            const stats = fs.statSync(fullPath);
            this.index.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              modified: stats.mtime.toISOString()
            });
          } catch(e) {}
        }
      }
    } catch(e) {}
  }
  
  saveIndex() {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ count: this.index.length, files: this.index }, null, 2));
  }
  
  search(query) {
    const q = query.toLowerCase();
    return this.index.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q)
    );
  }
}

module.exports = { DriveIndexer };

if (require.main === module) {
  const indexer = new DriveIndexer();
  console.log(indexer.indexDrive('C:\\Users\\quent\\.openclaw', { maxDepth: 3, maxFiles: 200 }));
}
