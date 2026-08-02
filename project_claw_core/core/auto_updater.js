/**
 * PROJECT CLAW CORE — Auto Updater
 * Check for updates and self-update from git.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'auto_updater.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class AutoUpdater {
  constructor(repoPath = process.cwd()) {
    this.repoPath = repoPath;
  }
  
  checkForUpdates() {
    log('Checking for updates');
    try {
      execSync('git fetch origin', { cwd: this.repoPath, windowsHide: true, timeout: 30000 });
      const local = execSync('git rev-parse HEAD', { cwd: this.repoPath, encoding: 'utf8', windowsHide: true }).trim();
      const remote = execSync('git rev-parse origin/master 2>$null || git rev-parse origin/main', { cwd: this.repoPath, encoding: 'utf8', windowsHide: true }).trim();
      return { success: true, local, remote, behind: local !== remote };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  update() {
    log('Running update');
    try {
      const output = execSync('git pull', { cwd: this.repoPath, encoding: 'utf8', windowsHide: true, timeout: 60000 });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { AutoUpdater };

if (require.main === module) {
  const updater = new AutoUpdater();
  console.log(JSON.stringify(updater.checkForUpdates(), null, 2));
}
