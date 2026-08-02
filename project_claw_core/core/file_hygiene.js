/**
 * PROJECT CLAW CORE — File Hygiene
 * Clean temp files, old logs, and duplicates.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'file_hygiene.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class FileHygiene {
  cleanTempDirs(dirs = [process.env.TEMP, 'C:\\Windows\\Temp']) {
    log('Cleaning temp directories');
    const summary = { deleted: 0, errors: 0, bytes_freed: 0 };
    
    for (const dir of dirs) {
      if (!dir || !fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isFile() && entry.name.startsWith('claw_')) {
            try {
              const size = fs.statSync(fullPath).size;
              fs.unlinkSync(fullPath);
              summary.deleted++;
              summary.bytes_freed += size;
            } catch(e) {
              summary.errors++;
            }
          }
        }
      } catch(e) {
        log(`Cannot clean ${dir}: ${e.message}`);
      }
    }
    
    return { success: true, summary };
  }
  
  cleanOldLogs(logDir, maxAgeDays = 7) {
    log(`Cleaning logs older than ${maxAgeDays} days in ${logDir}`);
    const summary = { deleted: 0, errors: 0, bytes_freed: 0 };
    
    if (!fs.existsSync(logDir)) return { success: true, summary };
    
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const entries = fs.readdirSync(logDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(logDir, entry.name);
      if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs < cutoff) {
            fs.unlinkSync(fullPath);
            summary.deleted++;
            summary.bytes_freed += stats.size;
          }
        } catch(e) {
          summary.errors++;
        }
      }
    }
    
    return { success: true, summary };
  }
  
  findDuplicates(dir, maxFiles = 1000) {
    log(`Finding duplicates in ${dir}`);
    const hashes = {};
    const duplicates = [];
    
    function walk(current) {
      if (duplicates.length >= 100) return;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (duplicates.length >= 100) break;
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(fullPath);
        } else if (entry.isFile()) {
          try {
            const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
            if (hashes[hash]) duplicates.push({ original: hashes[hash], duplicate: fullPath, hash });
            else hashes[hash] = fullPath;
          } catch(e) {}
        }
      }
    }
    
    walk(dir);
    return { success: true, duplicates };
  }
  
  scanDirectory(dir, maxFiles = 1000) {
    return this.findDuplicates(dir, maxFiles);
  }
}

module.exports = { FileHygiene };

if (require.main === module) {
  const fh = new FileHygiene();
  const tempDir = process.env.TEMP || 'C:\\temp';
  console.log('Clean temp:', fh.cleanTempDirs([tempDir]));
}
