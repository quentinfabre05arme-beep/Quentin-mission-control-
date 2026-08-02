const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'deploy_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function deployToVercel() {
  try {
    execSync('vercel --prod', { windowsHide: true, timeout: 120000 });
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

module.exports = { deployToVercel };