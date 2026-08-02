/**
 * PROJECT CLAW CORE — File Organizer
 * Actually organizes the Downloads folder by file type.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'file_organizer.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

const CATEGORIES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  installers: ['.exe', '.msi', '.dmg', '.pkg'],
  videos: ['.mp4', '.mov', '.avi', '.mkv', '.wmv'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg']
};

function getCategory(ext) {
  const lower = ext.toLowerCase();
  for (const [cat, exts] of Object.entries(CATEGORIES)) {
    if (exts.includes(lower)) return cat;
  }
  return 'other';
}

function organizeDownloads(downloadDir) {
  if (!fs.existsSync(downloadDir)) {
    log(`Downloads dir not found: ${downloadDir}`);
    return { success: false, error: 'Directory not found' };
  }
  
  const files = fs.readdirSync(downloadDir).filter(f => {
    const full = path.join(downloadDir, f);
    return fs.statSync(full).isFile();
  });
  
  let moved = 0;
  const summary = {};
  
  for (const file of files) {
    const ext = path.extname(file);
    const category = getCategory(ext);
    const targetDir = path.join(downloadDir, category);
    fs.mkdirSync(targetDir, { recursive: true });
    
    const source = path.join(downloadDir, file);
    const target = path.join(targetDir, file);
    
    try {
      fs.renameSync(source, target);
      moved++;
      summary[category] = (summary[category] || 0) + 1;
      log(`Moved ${file} → ${category}/`);
    } catch(e) {
      log(`Failed to move ${file}: ${e.message}`);
    }
  }
  
  return { success: true, moved, summary, total_files: files.length };
}

module.exports = { organizeDownloads, getCategory, CATEGORIES };

if (require.main === module) {
  const downloads = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Downloads');
  const result = organizeDownloads(downloads);
  console.log(JSON.stringify(result, null, 2));
}
