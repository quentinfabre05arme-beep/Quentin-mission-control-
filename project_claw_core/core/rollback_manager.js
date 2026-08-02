const { execSync } = require('child_process');

function rollback(commitHash) {
  try {
    execSync(`git checkout ${commitHash}`, { windowsHide: true });
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

module.exports = { rollback };