/**
 * PROJECT CLAW CORE — File Indexer
 * Deep file search across the PC with metadata.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'file_indexer.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class FileIndexer {
  constructor() {
    this.index = [];
  }
  
  indexDirectory(dir, options = {}) {
    const maxDepth = options.maxDepth || 5;
    const maxFiles = options.maxFiles || 1000;
    const pattern = options.pattern || null;
    
    log(`Indexing ${dir} (depth ${maxDepth}, max ${maxFiles})`);
    this._walk(dir, 0, maxDepth, maxFiles, pattern);
    return this.index;
  }
  
  _walk(dir, depth, maxDepth, maxFiles, pattern) {
    if (depth > maxDepth || this.index.length >= maxFiles) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (this.index.length >= maxFiles) break;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this._walk(fullPath, depth + 1, maxDepth, maxFiles, pattern);
        } else if (entry.isFile()) {
          if (pattern && !pattern.test(entry.name)) continue;
          try {
            const stats = fs.statSync(fullPath);
            this.index.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtime.toISOString(),
              ext: path.extname(entry.name).toLowerCase()
            });
          } catch(e) {}
        }
      }
    } catch(e) {
      log(`Cannot read ${dir}: ${e.message}`);
    }
  }
  
  search(query) {
    const q = query.toLowerCase();
    return this.index.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q)
    );
  }
  
  byExtension(ext) {
    const dot = ext.startsWith('.') ? ext : `.${ext}`;
    return this.index.filter(f => f.ext === dot.toLowerCase());
  }
  
  saveIndex(filePath) {
    fs.writeFileSync(filePath, JSON.stringify(this.index, null, 2));
    return { success: true, path: filePath, count: this.index.length };
  }
  
  index(dir, options = {}) {
    return { success: true, files: this.indexDirectory(dir, options).length };
  }
}

module.exports = { FileIndexer };

if (require.main === module) {
  const indexer = new FileIndexer();
  indexer.indexDirectory('C:\\Users\\quent\\.openclaw\\workspace', {
    maxDepth: 3,
    maxFiles: 100,
    pattern: /\.js$/
  });
  console.log('Indexed:', indexer.index.length);
  console.log('Search:', indexer.search('orchestrator').slice(0, 3));
}
