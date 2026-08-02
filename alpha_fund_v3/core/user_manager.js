const { execSync } = require('child_process');

function listUsers() {
  try {
    const result = execSync('wmic useraccount get Name,Status', { encoding: 'utf8', windowsHide: true });
    return result.split('\n').slice(1).filter(l => l.trim()).map(l => l.split(/\s{2,}/)[0]).filter(Boolean);
  } catch(e) { return []; }
}

module.exports = { listUsers };