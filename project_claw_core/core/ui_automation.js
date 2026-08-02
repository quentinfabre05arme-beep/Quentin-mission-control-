const { execSync } = require('child_process');

function launchApp(name) {
  try {
    execSync(`start "" "${name}"`, { windowsHide: true });
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

module.exports = { launchApp };