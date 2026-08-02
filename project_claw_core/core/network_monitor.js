/**
 * PROJECT CLAW CORE — Network Monitor
 * Ping hosts, check DNS, monitor interfaces.
 */

const { execSync } = require('child_process');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'network_monitor.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class NetworkMonitor {
  ping(host, count = 4) {
    log(`Pinging ${host}`);
    try {
      const output = execSync(`ping -n ${count} ${host}`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, host, output: output.trim() };
    } catch(e) {
      return { success: false, host, error: e.message, output: e.stdout || '' };
    }
  }
  
  resolveDns(hostname) {
    log(`Resolving DNS: ${hostname}`);
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, (err, address) => {
        if (err) reject(err);
        else resolve({ success: true, hostname, address });
      });
    });
  }
  
  getInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = {};
    for (const [name, addrs] of Object.entries(interfaces)) {
      result[name] = addrs.map(a => ({
        address: a.address,
        family: a.family,
        internal: a.internal
      }));
    }
    return result;
  }
  
  checkConnectivity(hosts = ['8.8.8.8', '1.1.1.1', 'google.com']) {
    log('Checking connectivity');
    const results = [];
    for (const host of hosts) {
      const result = this.ping(host, 2);
      results.push({
        host,
        reachable: result.success,
        output: result.success ? result.output.slice(0, 200) : result.error
      });
    }
    return results;
  }
}

module.exports = { NetworkMonitor };

if (require.main === module) {
  const monitor = new NetworkMonitor();
  console.log('Ping:', monitor.ping('8.8.8.8', 2));
  console.log('Connectivity:', monitor.checkConnectivity());
}
