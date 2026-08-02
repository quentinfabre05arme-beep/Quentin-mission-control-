
const { execSync } = require('child_process');

function listUSB() {
  try {
    const result = execSync('wmic path Win32_USBControllerDevice get Dependent', { encoding: 'utf8', windowsHide: true });
    return result.split('
').filter(l => l.includes('USB')).slice(0, 10);
  } catch(e) { return []; }
}

function listCameras() {
  try {
    const result = execSync('ffmpeg -list_devices true -f dshow -i dummy 2>&1', { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    return result.split('
').filter(l => l.includes('"'));
  } catch(e) { return []; }
}

module.exports = { listUSB, listCameras };
