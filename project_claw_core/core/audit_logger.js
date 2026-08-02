const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'audit.log');

function audit(action, details = {}) {
  const entry = {
    time: new Date().toISOString(),
    action,
    details
  };
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

module.exports = { audit };