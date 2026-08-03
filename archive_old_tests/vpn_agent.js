/**
 * PROJECT CLAW CORE — VPN Agent
 * Manage VPN connections on Windows.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'vpn_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class VPNAgent {
  listConnections() {
    log('Listing VPN connections');
    try {
      const output = execSync('powershell -c "Get-VpnConnection | Select-Object Name,ConnectionStatus,ServerAddress | ConvertTo-Json -Compress"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      if (!output.trim()) return { success: true, connections: [] };
      const data = JSON.parse(output);
      return { success: true, connections: Array.isArray(data) ? data : [data] };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  connect(name) {
    log(`Connecting VPN: ${name}`);
    try {
      execSync(`rasdial "${name}"`, { windowsHide: true, timeout: 30000 });
      return { success: true, name };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  disconnect(name) {
    log(`Disconnecting VPN: ${name}`);
    try {
      execSync(`rasdial "${name}" /disconnect`, { windowsHide: true, timeout: 30000 });
      return { success: true, name };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { VPNAgent };

if (require.main === module) {
  const vpn = new VPNAgent();
  console.log(JSON.stringify(vpn.listConnections(), null, 2));
}
