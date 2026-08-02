/**
 * PROJECT CLAW CORE — USB Manager
 * List USB devices via PowerShell.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'usb_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class USBManager {
  list() {
    log('Listing USB devices');
    try {
      const output = execSync('powershell -c "Get-PnpDevice -Class USB | Where-Object { $_.Present -eq $true } | Select-Object FriendlyName, InstanceId, Status | ConvertTo-Json -Compress"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      const data = JSON.parse(output);
      return { success: true, devices: Array.isArray(data) ? data : [data] };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { USBManager };

if (require.main === module) {
  const usb = new USBManager();
  const result = usb.list();
  console.log(`USB devices: ${result.devices ? result.devices.length : 0}`);
}
