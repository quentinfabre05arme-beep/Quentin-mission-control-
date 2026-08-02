/**
 * PROJECT CLAW CORE — Process Automation
 * List, start, and kill processes.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'process_automation.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ProcessAutomation {
  list() {
    log('Listing processes');
    try {
      const output = execSync('powershell -c "Get-Process | Select-Object Id, ProcessName, WorkingSet, CPU | ConvertTo-Json -Compress"', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 15000
      });
      const data = JSON.parse(output);
      const list = Array.isArray(data) ? data : [data];
      return { success: true, count: list.length, processes: list.slice(0, 20) };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  start(command, args = []) {
    log(`Starting process: ${command}`);
    try {
      const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return { success: true, pid: child.pid };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  kill(pid) {
    log(`Killing process: ${pid}`);
    try {
      execSync(`taskkill /PID ${pid} /F`, { windowsHide: true, timeout: 10000 });
      return { success: true };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  killByName(name) {
    log(`Killing process by name: ${name}`);
    try {
      execSync(`taskkill /IM "${name}" /F`, { windowsHide: true, timeout: 10000 });
      return { success: true };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { ProcessAutomation };

if (require.main === module) {
  const pa = new ProcessAutomation();
  console.log('Process count:', pa.list().count);
}
