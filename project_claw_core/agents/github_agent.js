const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'github_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class GitHubAgent {
  constructor(token) {
    this.token = token;
  }

  async listRepos() {
    log('Listing repositories');
    return [];
  }

  async createIssue(repo, title, body) {
    log('Creating issue in ' + repo);
    return { success: true, id: 'demo-' + Date.now() };
  }
}

module.exports = { GitHubAgent };