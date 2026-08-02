const { execSync } = require('child_process');
function listDrivers() {
  try {
    const result = execSync('driverquery /fo csv', { encoding: 'utf8', windowsHide: true });
    return result.split('\n').slice(1, 6);
  } catch(e) { return []; }
}
module.exports = { listDrivers };
