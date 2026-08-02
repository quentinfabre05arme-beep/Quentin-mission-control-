#!/usr/bin/env node
/**
 * 🔍 DEEP FILE INDEXER
 * Index entire PC for instant search
 */

const fs = require('fs');
const path = require('path');

const INDEX_FILE = path.join(__dirname, '..', 'data', 'file_index.json');

// ─── CONFIG ─────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Temp', 'tmp', 'cache',
  'Windows', 'Program Files', 'ProgramData',
  '$Recycle.Bin', 'System Volume Information'
]);

const SKIP_EXTS = new Set([
  '.tmp', '.log', '.cache', '.idx', '.pak'
]);

// ─── INDEXER ────────────────────────────────────────────────
class FileIndexer {
  constructor() {
    this.files = [];
    this.indexed = 0;
    this.errors = 0;
  }
  
  scan(dir, depth = 0) {
    if (depth > 4) return;
    
    const name = path.basename(dir);
    if (SKIP_DIRS.has(name) || name.startsWith('.')) return;
    
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fp = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          this.scan(fp, depth + 1);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (!SKIP_EXTS.has(ext)) {
            try {
              const stat = fs.statSync(fp);
              this.files.push({
                path: fp,
                name: item.name,
                ext,
                size: stat.size,
                modified: stat.mtime.toISOString(),
                dir: path.dirname(fp)
              });
              this.indexed++;
            } catch(e) {
              this.errors++;
            }
          }
        }
      }
    } catch(e) {
      this.errors++;
    }
  }
  
  save() {
    fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
    fs.writeFileSync(INDEX_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      total: this.indexed,
      errors: this.errors,
      files: this.files
    }, null, 2));
  }
  
  load() {
    if (fs.existsSync(INDEX_FILE)) {
      const data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
      this.files = data.files || [];
      return data;
    }
    return null;
  }
  
  search(query, limit = 20) {
    const q = query.toLowerCase();
    return this.files
      .filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.ext.includes(q)
      )
      .slice(0, limit);
  }
  
  byExtension(ext, limit = 20) {
    return this.files
      .filter(f => f.ext === ext.toLowerCase())
      .slice(0, limit);
  }
  
  recent(hours = 24, limit = 20) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.files
      .filter(f => new Date(f.modified) > cutoff)
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
      .slice(0, limit);
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { FileIndexer };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🔍 Deep File Indexer');
  console.log('');
  
  const indexer = new FileIndexer();
  
  // Try loading existing index
  const existing = indexer.load();
  if (existing) {
    console.log(`Loaded existing index: ${existing.total} files`);
  }
  
  // Scan workspace
  console.log('Scanning workspace...');
  indexer.scan(process.cwd());
  indexer.save();
  
  console.log(`Indexed: ${indexer.indexed} files`);
  console.log(`Errors: ${indexer.errors}`);
  console.log('');
  
  // Search test
  console.log('Search: "gui_control"');
  const results = indexer.search('gui_control', 5);
  results.forEach(f => console.log(`  ${f.name} (${Math.round(f.size/1024)}KB)`));
  
  console.log('');
  console.log('Recent JS files:');
  const recent = indexer.recent(1).filter(f => f.ext === '.js').slice(0, 5);
  recent.forEach(f => console.log(`  ${f.name}`));
  
  console.log('');
  console.log('Indexer ready');
}
