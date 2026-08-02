/**
 * PROJECT CLAW CORE — System Health Monitor
 * Real RAM, disk, process, and network monitoring.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'system_health_monitor.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class SystemHealthMonitor {
  getMemory() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      total_gb: (total / 1024 / 1024 / 1024).toFixed(2),
      used_gb: (used / 1024 / 1024 / 1024).toFixed(2),
      free_gb: (free / 1024 / 1024 / 1024).toFixed(2),
      used_percent: ((used / total) * 100).toFixed(1)
    };
  }
  
  getCpu() {
    const cpus = os.cpus();
    return {
      count: cpus.length,
      model: cpus[0]?.model,
      load_avg_1m: os.loadavg()[0]
    };
  }
  
  getDisk() {
    try {
      const output = execSync('wmic logicaldisk get DeviceID,Size,FreeSpace /format:csv', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      
      const lines = output.split('\n').filter(l => l.trim());
      const drives = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
          const drive = parts[1]?.replace(/"/g, '');
          const free = parseInt(parts[2]?.replace(/"/g, '') || 0);
          const size = parseInt(parts[3]?.replace(/"/g, '') || 0);
          if (size > 0) {
            drives.push({
              drive,
              free_gb: (free / 1024 / 1024 / 1024).toFixed(2),
              total_gb: (size / 1024 / 1024 / 1024).toFixed(2),
              used_percent: (((size - free) / size) * 100).toFixed(1)
            });
          }
        }
      }
      return drives;
    } catch(e) {
      return [{ error: e.message }];
    }
  }
  
  getTopProcesses(count = 10) {
    try {
      const output = execSync('powershell -c "Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 Name, Id, @{N=\\\"MemoryMB\\\";E={[math]::Round($_.WorkingSet/1MB,2)}}, CPU | Format-Table -AutoSize"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return output.trim();
    } catch(e) {
      return { error: e.message };
    }
  }
  
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = {};
    for (const [name, addrs] of Object.entries(interfaces)) {
      result[name] = addrs.map(a => ({ address: a.address, family: a.family }));
    }
    return result;
  }
  
  getHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      memory: this.getMemory(),
      cpu: this.getCpu(),
      disk: this.getDisk(),
      network: this.getNetworkInterfaces(),
      processes: this.getTopProcesses(),
      uptime_seconds: os.uptime()
    };
    log(`Health snapshot: RAM ${health.memory.used_percent}%`);
    return health;
  }
  
  checkAlerts() {
    const health = this.getHealth();
    const alerts = [];
    if (parseFloat(health.memory.used_percent) > 90) alerts.push('RAM critical');
    for (const d of health.disk) {
      if (parseFloat(d.used_percent) > 90) alerts.push(`Disk ${d.drive} critical`);
    }
    return { health, alerts };
  }
}

module.exports = { SystemHealthMonitor };

if (require.main === module) {
  const monitor = new SystemHealthMonitor();
  console.log(JSON.stringify(monitor.getHealth(), null, 2));
}
