/**
 * PROJECT CLAW CORE — Git Agent
 * Local git operations (commit, push, branch, status).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'git_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class GitAgent {
  constructor(repoPath = process.cwd()) {
    this.repoPath = path.resolve(repoPath);
  }
  
  _exec(args) {
    log(`git ${args.join(' ')} in ${this.repoPath}`);
    try {
      const result = execSync(`git ${args.join(' ')}`, {
        cwd: this.repoPath,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 60000
      });
      return { success: true, output: result.trim() };
    } catch(e) {
      log(`Git error: ${e.message}`);
      return { success: false, error: e.message, output: e.stdout || '' };
    }
  }
  
  status() {
    return this._exec(['status', '--short']);
  }
  
  branch() {
    return this._exec(['branch', '--show-current']);
  }
  
  log(limit = 10) {
    return this._exec(['log', '--oneline', `-${limit}`]);
  }
  
  add(pattern = '.') {
    return this._exec(['add', pattern]);
  }
  
  commit(message) {
    return this._exec(['commit', '-m', `"${message.replace(/"/g, '\\"')}"`]);
  }
  
  push(remote = 'origin', branch = '') {
    const args = branch ? ['push', remote, branch] : ['push'];
    return this._exec(args);
  }
  
  pull() {
    return this._exec(['pull']);
  }
  
  diff() {
    return this._exec(['diff', '--stat']);
  }
  
  autoCommitAndPush(message) {
    const status = this.status();
    if (!status.output) {
      return { success: true, note: 'nothing to commit' };
    }
    this.add('.');
    const commit = this.commit(message);
    if (!commit.success) return commit;
    return this.push();
  }
}

module.exports = { GitAgent };

if (require.main === module) {
  const agent = new GitAgent('C:\\Users\\quent\\.openclaw\\workspace');
  console.log('Status:', agent.status());
  console.log('Branch:', agent.branch());
}
