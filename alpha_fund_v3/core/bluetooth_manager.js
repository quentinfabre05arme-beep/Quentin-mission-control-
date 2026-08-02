const { execSync } = require('child_process');

function listDevices() {
  try {
    const result = execSync('powershell -c "Get-PnpDevice -Class Bluetooth | Select-Object Name, Status | Format-Table -AutoSize"', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}

module.exports = { listDevices };