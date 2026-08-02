const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'risk_engine.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function calculateRisk(portfolio) {
  log('Calculating risk');
  return { maxDrawdown: 0, var95: 0 };
}

module.exports = { calculateRisk };