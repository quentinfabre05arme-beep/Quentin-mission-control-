const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'web_monitor.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class WebMonitor {
  constructor() {}
  async check(url) { log('Checking ' + url); return { changed: false }; }
}

module.exports = { WebMonitor };