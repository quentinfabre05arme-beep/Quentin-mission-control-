// OpenClaw Autonomous Lifecycle Manager
// Can start, stop, restart, and auto-recover OpenClaw

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = 'C:\\Users\\quent\\.openclaw\\workspace\\memory\\openclaw_manager.log';
const BASE_DIR = 'C:\\Users\\quent\\.openclaw';
const GATEWAY_CMD = path.join(BASE_DIR, 'gateway.cmd');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

class OpenClawManager {
  constructor() {
    this.processes = [];
  }

  // Check if OpenClaw is running
  isRunning() {
    try {
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.includes('node.exe'));
      
      // Check if any node process has openclaw in command line
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length > 1) {
          const pid = parts[1].replace(/"/g, '').trim();
          try {
            const cmdLine = execSync(`wmic process where ProcessId=${pid} get CommandLine /value`, { encoding: 'utf8' });
            if (cmdLine.includes('openclaw')) {
              return true;
            }
          } catch (e) {}
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Check if gateway port is responsive
  isHealthy() {
    try {
      const result = execSync('powershell -Command "try { $r = Invoke-WebRequest -Uri http://localhost:18789/health -TimeoutSec 5; exit $r.StatusCode } catch { exit 0 }"', { encoding: 'utf8', timeout: 10000 });
      return parseInt(result.trim()) === 200;
    } catch (e) {
      return false;
    }
  }

  // Start OpenClaw
  start() {
    log('Starting OpenClaw...');
    try {
      if (this.isRunning()) {
        log('OpenClaw already running');
        return { success: true, message: 'Already running' };
      }

      // Start gateway
      const child = spawn('cmd.exe', ['/c', GATEWAY_CMD], {
        detached: true,
        stdio: 'ignore',
        cwd: BASE_DIR
      });

      child.unref();
      
      // Wait and verify
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (this.isRunning()) {
          clearInterval(checkInterval);
          log('OpenClaw started successfully');
        } else if (attempts > 30) {
          clearInterval(checkInterval);
          log('Failed to start OpenClaw after 30 attempts');
        }
      }, 1000);

      return { success: true, message: 'Start initiated' };
    } catch (e) {
      log('Error starting: ' + e.message);
      return { success: false, error: e.message };
    }
  }

  // Stop OpenClaw gracefully
  stop() {
    log('Stopping OpenClaw...');
    try {
      // Try graceful shutdown first
      try {
        execSync('openclaw gateway stop', { timeout: 10000, stdio: 'pipe' });
      } catch (e) {
        // Graceful failed, force kill
      }

      // Force kill remaining processes
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.includes('node.exe'));
      
      let killed = 0;
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length > 1) {
          const pid = parts[1].replace(/"/g, '').trim();
          try {
            const cmdLine = execSync(`wmic process where ProcessId=${pid} get CommandLine /value`, { encoding: 'utf8' });
            if (cmdLine.includes('openclaw')) {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
              killed++;
            }
          } catch (e) {}
        }
      }

      log(`Stopped ${killed} OpenClaw processes`);
      return { success: true, message: `Stopped ${killed} processes` };
    } catch (e) {
      log('Error stopping: ' + e.message);
      return { success: false, error: e.message };
    }
  }

  // Restart OpenClaw
  restart() {
    log('Restarting OpenClaw...');
    const stopResult = this.stop();
    
    if (stopResult.success) {
      // Wait for processes to die
      let attempts = 0;
      const waitInterval = setInterval(() => {
        attempts++;
        if (!this.isRunning() || attempts > 10) {
          clearInterval(waitInterval);
          // Start fresh
          setTimeout(() => {
            this.start();
          }, 3000);
        }
      }, 1000);
    }

    return { success: true, message: 'Restart initiated' };
  }

  // Auto-recovery: Check health and restart if needed
  autoRecover() {
    log('Running auto-recovery check...');
    
    if (!this.isRunning()) {
      log('OpenClaw not running, starting...');
      return this.start();
    }

    if (!this.isHealthy()) {
      log('OpenClaw unhealthy, restarting...');
      return this.restart();
    }

    log('OpenClaw is healthy');
    return { success: true, message: 'Healthy' };
  }

  // Get status
  status() {
    const running = this.isRunning();
    const healthy = running ? this.isHealthy() : false;
    
    return {
      running,
      healthy,
      pid: running ? this.getPid() : null,
      uptime: running ? this.getUptime() : null
    };
  }

  getPid() {
    try {
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf8' });
      const lines = output.split('\n').filter(l => l.includes('node.exe'));
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length > 1) {
          const pid = parts[1].replace(/"/g, '').trim();
          try {
            const cmdLine = execSync(`wmic process where ProcessId=${pid} get CommandLine /value`, { encoding: 'utf8' });
            if (cmdLine.includes('openclaw')) {
              return pid;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    return null;
  }

  getUptime() {
    // Approximate uptime from process start time
    return 'Unknown';
  }
}

// CLI interface
if (require.main === module) {
  const manager = new OpenClawManager();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      console.log(JSON.stringify(manager.start(), null, 2));
      break;
    case 'stop':
      console.log(JSON.stringify(manager.stop(), null, 2));
      break;
    case 'restart':
      console.log(JSON.stringify(manager.restart(), null, 2));
      break;
    case 'status':
      console.log(JSON.stringify(manager.status(), null, 2));
      break;
    case 'recover':
      console.log(JSON.stringify(manager.autoRecover(), null, 2));
      break;
    default:
      console.log('Usage: node manager.js {start|stop|restart|status|recover}');
  }
}

module.exports = OpenClawManager;
