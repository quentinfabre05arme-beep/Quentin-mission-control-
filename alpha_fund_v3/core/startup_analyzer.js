const { execSync } = require('child_process');
function analyzeStartup() {
  try {
    const result = execSync('wmic startup get Caption, Command, Location', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}
module.exports = { analyzeStartup };
