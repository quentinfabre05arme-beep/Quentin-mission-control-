const { execSync } = require('child_process');
function getNetstat() {
  try {
    const result = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}
module.exports = { getNetstat };
