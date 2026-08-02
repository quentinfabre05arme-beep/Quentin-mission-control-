const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'market_watcher.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function detectTrends(data) {
  log('Detecting trends'); return []; }

module.exports = { detectTrends };