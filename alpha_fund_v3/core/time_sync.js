const { execSync } = require('child_process');

function syncTime() {
  try {
    execSync('w32tm /resync', { windowsHide: true });
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function getTime() {
  return new Date().toISOString();
}

module.exports = { syncTime, getTime };