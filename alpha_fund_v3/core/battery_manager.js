const { execSync } = require('child_process');

function getBatteryStatus() {
  try {
    const result = execSync('powershell -c "Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus"', { encoding: 'utf8', windowsHide: true });
    return result;
  } catch(e) { return { error: e.message }; }
}

module.exports = { getBatteryStatus };