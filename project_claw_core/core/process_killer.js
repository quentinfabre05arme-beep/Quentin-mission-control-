/**
 * PROJECT CLAW CORE — Process Killer
 * Kill processes by name or PID.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'process_killer.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ProcessKiller {
  byName(name) {
    log(`Killing process by name: ${name}`);
    try {
      execSync(`taskkill /IM "${name}" /F`, { windowsHide: true, timeout: 10000 });
      return { success: true, name };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  byPid(pid) {
    log(`Killing process by PID: ${pid}`);
    try {
      execSync(`taskkill /PID ${pid} /F`, { windowsHide: true, timeout: 10000 });
      return { success: true, pid };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { ProcessKiller };

if (require.main === module) {
  const pk = new ProcessKiller();
  console.log('ProcessKiller loaded');
}
