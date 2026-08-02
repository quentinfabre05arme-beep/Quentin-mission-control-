const { execSync } = require('child_process');
function getARP() {
  try {
    const result = execSync('arp -a', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}
module.exports = { getARP };
