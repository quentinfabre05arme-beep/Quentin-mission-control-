/**
 * PROJECT CLAW CORE — Battery Manager
 * Read laptop battery status on Windows.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'battery_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class BatteryManager {
  getStatus() {
    log('Reading battery status');
    try {
      const output = execSync('powershell -c "Get-WmiObject -Class Win32_Battery | Select-Object BatteryStatus, EstimatedChargeRemaining, EstimatedRunTime | ConvertTo-Json -Compress"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      
      const data = JSON.parse(output);
      const battery = Array.isArray(data) ? data[0] : data;
      
      if (!battery || battery.BatteryStatus === undefined) {
        return { success: false, note: 'No battery found (desktop PC or no battery data)' };
      }
      
      const statusMap = {
        1: 'discharging',
        2: 'charging',
        3: 'fully_charged',
        4: 'low',
        5: 'critical'
      };
      
      return {
        success: true,
        status: statusMap[battery.BatteryStatus] || 'unknown',
        percent: battery.EstimatedChargeRemaining,
        estimated_runtime_minutes: battery.EstimatedRunTime
      };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { BatteryManager };

if (require.main === module) {
  const bm = new BatteryManager();
  console.log(JSON.stringify(bm.getStatus(), null, 2));
}
