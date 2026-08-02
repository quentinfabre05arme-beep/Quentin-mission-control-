/**
 * PROJECT CLAW CORE — Temperature Monitor
 * Monitor CPU/GPU temperature via PowerShell (fallback if no sensors).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'temperature_monitor.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class TemperatureMonitor {
  read() {
    log('Reading temperatures');
    try {
      const output = execSync('powershell -c "Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi | Select-Object InstanceName, Temperature | ConvertTo-Json -Compress"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      if (!output.trim()) return { success: true, temperatures: [], note: 'No thermal zone data available' };
      const data = JSON.parse(output);
      const temps = Array.isArray(data) ? data : [data];
      return {
        success: true,
        temperatures: temps.map(t => ({
          zone: t.InstanceName,
          celsius: t.Temperature ? (t.Temperature - 2732) / 10 : null
        }))
      };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { TemperatureMonitor };

if (require.main === module) {
  const monitor = new TemperatureMonitor();
  console.log(JSON.stringify(monitor.read(), null, 2));
}
