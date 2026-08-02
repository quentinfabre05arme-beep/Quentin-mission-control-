const { execSync } = require('child_process');

function listUSB() {
  try {
    const result = execSync('wmic path Win32_USBControllerDevice get Dependent', { encoding: 'utf8', windowsHide: true });
    return result.split('\n').filter(l => l.includes('USB')).slice(0, 20);
  } catch(e) { return []; }
}

module.exports = { listUSB };