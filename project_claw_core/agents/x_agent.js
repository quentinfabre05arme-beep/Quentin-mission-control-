const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'x_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class XAgent {
  constructor(credentials) { this.credentials = credentials; }
  async post(text) { log('Posting: ' + text); return { success: true }; }
  async readTimeline(count = 10) { log('Reading timeline'); return []; }
}

module.exports = { XAgent };