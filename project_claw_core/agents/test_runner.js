const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'test_runner.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function runTests(cmd) {
  try {
    const result = execSync(cmd, { encoding: 'utf8', windowsHide: true });
    log('Tests passed');
    return { success: true, output: result };
  } catch(e) {
    log('Tests failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { runTests };