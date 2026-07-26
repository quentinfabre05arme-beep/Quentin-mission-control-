/**
 * Memory Maintenance - Safe Version
 * Scans memory files, reports issues, archives old files
 * Silent operation - logs to console only, reports critical issues
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');

const CRITICAL_SIZE_MB = 5;
const ARCHIVE_DAYS = 60;
const MAX_ERRORS = 3;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function now() {
  return new Date().toISOString().slice(0, 10);
}

function getFileSizeMB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
  } catch (e) {
    return -1;
  }
}

function getFileAgeDays(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs / (1000 * 60 * 60 * 24);
  } catch (e) {
    return 0;
  }
}

function isValidDateFilename(filename) {
  // Matches: 2026-07-26.md or 2026-07-26-something.md
  return /^\d{4}-\d{2}-\d{2}/.test(filename);
}

function runMaintenance() {
  log('=== Memory Maintenance Started ===');
  
  let errors = 0;
  let criticalFiles = [];
  let archivedCount = 0;
  let totalFiles = 0;
  let totalSizeMB = 0;

  // Ensure archive dir exists
  if (!fs.existsSync(ARCHIVE_DIR)) {
    try {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
      log('Created archive directory');
    } catch (e) {
      errors++;
      log(`ERROR: Cannot create archive dir: ${e.message}`);
    }
  }

  // Scan memory files
  try {
    const entries = fs.readdirSync(MEMORY_DIR);
    const files = entries.filter(e => {
      const fullPath = path.join(MEMORY_DIR, e);
      return fs.statSync(fullPath).isFile() && e.endsWith('.md');
    });

    totalFiles = files.length;
    log(`Scanning ${totalFiles} memory files...`);

    for (const file of files) {
      const filePath = path.join(MEMORY_DIR, file);
      const sizeMB = getFileSizeMB(filePath);
      const ageDays = getFileAgeDays(filePath);
      
      if (sizeMB < 0) {
        errors++;
        log(`ERROR: Cannot read file: ${file}`);
        continue;
      }

      totalSizeMB += sizeMB;

      // Check critical size
      if (sizeMB > CRITICAL_SIZE_MB) {
        criticalFiles.push({ file, sizeMB, reason: 'oversized' });
      }

      // Check if old enough to archive
      if (ageDays > ARCHIVE_DAYS && isValidDateFilename(file)) {
        const destPath = path.join(ARCHIVE_DIR, file);
        try {
          fs.renameSync(filePath, destPath);
          archivedCount++;
          log(`Archived: ${file} (${ageDays.toFixed(0)} days old)`);
        } catch (e) {
          errors++;
          log(`ERROR: Failed to archive ${file}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    errors++;
    log(`ERROR: Failed to scan memory directory: ${e.message}`);
  }

  // Report
  log('');
  log('=== Memory Maintenance Report ===');
  log(`Files scanned: ${totalFiles}`);
  log(`Total size: ${totalSizeMB.toFixed(2)} MB`);
  log(`Archived: ${archivedCount}`);
  log(`Errors: ${errors}`);
  
  if (criticalFiles.length > 0) {
    log(`CRITICAL: ${criticalFiles.length} oversized files detected:`);
    for (const cf of criticalFiles) {
      log(`  - ${cf.file} (${cf.sizeMB.toFixed(2)} MB)`);
    }
  }

  // Determine if we need to notify
  const shouldNotify = errors > MAX_ERRORS || criticalFiles.length > 0;
  
  log('');
  if (shouldNotify) {
    log(`ALERT: ${errors} errors, ${criticalFiles.length} critical files. User notification required.`);
  } else {
    log('Status: HEALTHY - No action needed');
  }
  
  log('=== Memory Maintenance Complete ===');
  
  // Return exit code for scripting
  process.exit(shouldNotify ? 1 : 0);
}

runMaintenance();
