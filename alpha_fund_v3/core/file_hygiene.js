/**
 * 🗑️ FILE HYGIENE ENGINE
 * Auto-archive old files to keep workspace clean
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  max_age_days: 30,
  archive_dir: path.join(__dirname, '..', '..', 'archive', 'auto_archive_' + new Date().toISOString().split('T')[0]),
  protected_dirs: ['.git', 'node_modules', '.openclaw', 'alpha_fund_v3', 'archive'],
  protected_files: ['README.md', 'AGENTS.md', 'SOUL.md', 'USER.md', 'MEMORY.md', 'HEARTBEAT.md']
};

function shouldArchive(filePath, stat) {
  const age = Date.now() - stat.mtime.getTime();
  const ageDays = age / (24 * 60 * 60 * 1000);
  
  if (ageDays < CONFIG.max_age_days) return false;
  if (stat.isDirectory()) return false; // Don't archive directories yet
  
  const basename = path.basename(filePath);
  if (CONFIG.protected_files.includes(basename)) return false;
  
  // Don't archive files in protected dirs
  const parts = filePath.split(path.sep);
  if (CONFIG.protected_dirs.some(d => parts.includes(d))) return false;
  
  return true;
}

function archiveFile(filePath) {
  try {
    const relative = path.relative(process.cwd(), filePath);
    const archivePath = path.join(CONFIG.archive_dir, relative);
    
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    fs.renameSync(filePath, archivePath);
    
    return true;
  } catch(e) {
    return false;
  }
}

function runHygiene() {
  let archived = 0;
  let checked = 0;
  
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recurse into subdirectories (but not protected ones)
          if (!CONFIG.protected_dirs.includes(item)) {
            scan(fullPath);
          }
        } else {
          checked++;
          if (shouldArchive(fullPath, stat)) {
            if (archiveFile(fullPath)) {
              archived++;
            }
          }
        }
      } catch(e) {}
    });
  }
  
  // Scan specific directories that tend to accumulate
  const dirsToClean = ['logs', 'tmp', 'cache', 'missions', 'content_output'];
  dirsToClean.forEach(d => {
    scan(path.join(process.cwd(), d));
  });
  
  const result = {
    checked,
    archived,
    archive_location: CONFIG.archive_dir,
    timestamp: new Date().toISOString()
  };
  
  // Log
  fs.mkdirSync(path.dirname(CONFIG.archive_dir), { recursive: true });
  fs.appendFileSync(
    path.join(path.dirname(CONFIG.archive_dir), 'hygiene_log.jsonl'),
    JSON.stringify(result) + '\n'
  );
  
  console.log(`🗑️ File hygiene: ${archived}/${checked} old files archived`);
  return result;
}

module.exports = { runHygiene, CONFIG };

if (require.main === module) {
  runHygiene();
}
