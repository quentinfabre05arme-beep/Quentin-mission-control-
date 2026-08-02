
const { execSync } = require('child_process');

function listPrinters() {
  try {
    const result = execSync('wmic printer get Name,Status', { encoding: 'utf8', windowsHide: true });
    return result.split('
').slice(1).filter(l => l.trim()).map(l => l.trim());
  } catch(e) { return []; }
}

module.exports = { listPrinters };
