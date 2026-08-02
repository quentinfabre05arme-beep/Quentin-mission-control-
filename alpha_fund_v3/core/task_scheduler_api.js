
const { execSync } = require('child_process');

function listTasks() {
  try {
    const result = execSync('schtasks /query /fo csv /nh', { encoding: 'utf8', windowsHide: true });
    return result.split('
').slice(0, 20).map(l => l.split(',')[0]?.replace(/"/g, '')).filter(Boolean);
  } catch(e) { return []; }
}

module.exports = { listTasks };
