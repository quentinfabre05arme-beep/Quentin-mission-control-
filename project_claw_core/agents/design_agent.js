const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'design_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function createLandingPage(title) {
  log('Designing page: ' + title);
  return { html: '<h1>' + title + '</h1>' };
}

module.exports = { createLandingPage };