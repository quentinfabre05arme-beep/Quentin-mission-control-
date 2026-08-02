
const { execSync } = require('child_process');

function listScanners() {
  try {
    const result = execSync('wmic scanner get Name', { encoding: 'utf8', windowsHide: true });
    return result.split('
').slice(1).filter(l => l.trim()).map(l => l.trim());
  } catch(e) { return []; }
}

module.exports = { listScanners };
