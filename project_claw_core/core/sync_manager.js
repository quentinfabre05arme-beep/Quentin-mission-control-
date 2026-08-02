/**
 * PROJECT CLAW CORE — Sync Manager
 * Sync files between directories.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'sync_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

class SyncManager {
  syncDirectory(source, target, options = {}) {
    log(`Syncing ${source} → ${target}`);
    const dryRun = options.dryRun || false;
    const copied = [];
    const skipped = [];
    
    function walk(srcDir, tgtDir) {
      fs.mkdirSync(tgtDir, { recursive: true });
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const tgtPath = path.join(tgtDir, entry.name);
        if (entry.isDirectory()) {
          walk(srcPath, tgtPath);
        } else {
          let needsCopy = true;
          if (fs.existsSync(tgtPath)) {
            try {
              if (hashFile(srcPath) === hashFile(tgtPath)) needsCopy = false;
            } catch(e) {}
          }
          if (needsCopy) {
            if (!dryRun) fs.copyFileSync(srcPath, tgtPath);
            copied.push(srcPath);
          } else {
            skipped.push(srcPath);
          }
        }
      }
    }
    
    walk(source, target);
    return { success: true, copied: copied.length, skipped: skipped.length };
  }
}

module.exports = { SyncManager };

if (require.main === module) {
  const sm = new SyncManager();
  const testSrc = 'project_claw_core/dashboard';
  const testTgt = 'project_claw_core/dashboard_backup';
  console.log(JSON.stringify(sm.syncDirectory(testSrc, testTgt), null, 2));
}
