/**
 * PROJECT CLAW CORE — Rollback Manager
 * Revert failed changes via git.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'rollback_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class RollbackManager {
  constructor(repoPath = process.cwd()) {
    this.repoPath = repoPath;
  }
  
  getLastCommit() {
    try {
      const output = execSync('git log -1 --oneline', {
        cwd: this.repoPath,
        encoding: 'utf8',
        windowsHide: true
      });
      return { success: true, commit: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  revertLastCommit() {
    log('Reverting last commit');
    try {
      const output = execSync('git revert HEAD --no-edit', {
        cwd: this.repoPath,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  resetHard(ref = 'HEAD~1') {
    log(`Hard reset to ${ref}`);
    try {
      const output = execSync(`git reset --hard ${ref}`, {
        cwd: this.repoPath,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  stashChanges() {
    log('Stashing changes');
    try {
      const output = execSync('git stash push -m "Auto stash before rollback"', {
        cwd: this.repoPath,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { RollbackManager };

if (require.main === module) {
  const rm = new RollbackManager();
  console.log(rm.getLastCommit());
}
