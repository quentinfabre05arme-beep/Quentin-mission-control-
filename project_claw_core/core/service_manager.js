/**
 * PROJECT CLAW CORE — Service Manager
 * List/start/stop Windows services.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'service_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ServiceManager {
  list() {
    log('Listing services');
    try {
      const output = execSync('powershell -c "Get-Service | Select-Object Name, Status, StartType | ConvertTo-Json -Compress"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      const data = JSON.parse(output);
      return { success: true, services: Array.isArray(data) ? data.slice(0, 50) : [data] };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  getStatus(serviceName) {
    log(`Getting status of ${serviceName}`);
    try {
      const output = execSync(`powershell -c "Get-Service -Name '${serviceName}' | Select-Object Name, Status | ConvertTo-Json -Compress"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, service: JSON.parse(output) };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  start(serviceName) {
    log(`Starting service: ${serviceName}`);
    try {
      const output = execSync(`net start "${serviceName}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  stop(serviceName) {
    log(`Stopping service: ${serviceName}`);
    try {
      const output = execSync(`net stop "${serviceName}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { ServiceManager };

if (require.main === module) {
  const sm = new ServiceManager();
  console.log(JSON.stringify(sm.getStatus('Spooler'), null, 2));
}
