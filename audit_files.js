const fs = require('fs');
const path = require('path');

const TARGET_DIR = 'C:\\Users\\quent\\.openclaw';
const IGNORED_DIRS = ['.git', 'node_modules'];

function scanDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        if (!IGNORED_DIRS.includes(item.name)) {
          scanDirectory(fullPath, results);
        }
      } else {
        const stats = fs.statSync(fullPath);
        results.push({
          path: fullPath,
          relative: fullPath.replace(TARGET_DIR + '\\', ''),
          size: stats.size,
          mtime: stats.mtime
        });
      }
    }
  } catch (err) {
    // Permission denied or other error
  }
  
  return results;
}

console.log('Scanning', TARGET_DIR, '...');
const files = scanDirectory(TARGET_DIR);

// Sort by size descending
files.sort((a, b) => b.size - a.size);

const totalSize = files.reduce((sum, f) => sum + f.size, 0);
const totalSizeGB = (totalSize / 1024 / 1024 / 1024).toFixed(2);

console.log('\n=== AUDIT RESULTS ===');
console.log('Total files:', files.length);
console.log('Total size:', totalSizeGB, 'GB');
console.log('\n=== TOP 50 LARGEST FILES ===');

files.slice(0, 50).forEach((file, i) => {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  console.log(`${(i + 1).toString().padStart(2)}. ${file.relative}`);
  console.log(`    Size: ${sizeMB} MB | Modified: ${file.mtime.toISOString().split('T')[0]}`);
});

// Find duplicate file names
const nameMap = {};
files.forEach(f => {
  const name = path.basename(f.path);
  if (!nameMap[name]) nameMap[name] = [];
  nameMap[name].push(f);
});

const duplicates = Object.entries(nameMap).filter(([name, items]) => items.length > 1);

console.log('\n=== POTENTIAL DUPLICATES (same filename) ===');
duplicates.forEach(([name, items]) => {
  console.log(`\n${name} (${items.length} copies):`);
  items.forEach(item => {
    console.log(`  - ${item.relative} (${(item.size/1024/1024).toFixed(2)} MB)`);
  });
});

// Find old files (> 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const oldFiles = files.filter(f => f.mtime < thirtyDaysAgo);
const oldSizeGB = (oldFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024 / 1024).toFixed(2);

console.log('\n=== FILES OLDER THAN 30 DAYS ===');
console.log(`Count: ${oldFiles.length} files, Size: ${oldSizeGB} GB`);
oldFiles.slice(0, 20).forEach(file => {
  console.log(`- ${file.relative} (${(file.size/1024/1024).toFixed(2)} MB, ${file.mtime.toISOString().split('T')[0]})`);
});

// Find config backup files
const backupFiles = files.filter(f => 
  f.relative.includes('.bak') || 
  f.relative.includes('.backup') || 
  f.relative.includes('clobbered')
);
const backupSizeMB = (backupFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2);

console.log('\n=== CONFIG BACKUP FILES ===');
console.log(`Count: ${backupFiles.length} files, Size: ${backupSizeMB} MB`);
backupFiles.forEach(file => {
  console.log(`- ${file.relative} (${(file.size/1024/1024).toFixed(2)} MB)`);
});

// Summary by extension
const extMap = {};
files.forEach(f => {
  const ext = path.extname(f.path).toLowerCase() || '(no extension)';
  if (!extMap[ext]) extMap[ext] = { count: 0, size: 0 };
  extMap[ext].count++;
  extMap[ext].size += f.size;
});

console.log('\n=== FILE TYPES SUMMARY ===');
Object.entries(extMap)
  .sort((a, b) => b[1].size - a[1].size)
  .forEach(([ext, data]) => {
    const sizeMB = (data.size / 1024 / 1024).toFixed(2);
    console.log(`${ext}: ${data.count} files, ${sizeMB} MB`);
  });

// Workspace-specific audit
console.log('\n=== WORKSPACE SUBDIRECTORIES ===');
const workspaceDir = path.join(TARGET_DIR, 'workspace');
if (fs.existsSync(workspaceDir)) {
  const subdirs = fs.readdirSync(workspaceDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const subPath = path.join(workspaceDir, d.name);
      const subFiles = scanDirectory(subPath);
      const subSize = (subFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2);
      return { name: d.name, count: subFiles.length, size: parseFloat(subSize) };
    })
    .sort((a, b) => b.size - a.size);
  
  subdirs.forEach(dir => {
    console.log(`${dir.name}: ${dir.count} files, ${dir.size.toFixed(2)} MB`);
  });
}

console.log('\n=== END OF AUDIT ===');