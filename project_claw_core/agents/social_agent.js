const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'social_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function createPost(platform, topic) {
  log('Creating post for ' + platform + ': ' + topic);
  return { platform, text: topic };
}

module.exports = { createPost };