const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'research_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ResearchAgent {
  constructor() {}
  async search(query) { log('Researching: ' + query); return []; }
  async summarize(url) { log('Summarizing: ' + url); return ''; }
}

module.exports = { ResearchAgent };