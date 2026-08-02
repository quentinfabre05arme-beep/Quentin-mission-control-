const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'linkedin_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class LinkedInAgent {
  constructor() {}
  async post(text) { log('LinkedIn post: ' + text); return { success: true }; }
}

module.exports = { LinkedInAgent };