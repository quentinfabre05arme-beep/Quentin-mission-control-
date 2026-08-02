const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'content_factory.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function generateNewsletter(topic) {
  log('Generating newsletter: ' + topic);
  return { title: topic, sections: [] };
}

module.exports = { generateNewsletter };