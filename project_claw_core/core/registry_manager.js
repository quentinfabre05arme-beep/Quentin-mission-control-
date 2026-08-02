/**
 * PROJECT CLAW CORE — Registry Manager
 * Read and write Windows registry keys.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'registry_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class RegistryManager {
  read(key, valueName) {
    log(`Reading registry: ${key}\\${valueName}`);
    try {
      const output = execSync(`reg query "${key}" /v "${valueName}" 2>&1`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  readKey(key) {
    log(`Reading registry key: ${key}`);
    try {
      const output = execSync(`reg query "${key}" 2>&1`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  writeString(key, valueName, value) {
    log(`Writing registry string: ${key}\\${valueName} = ${value}`);
    try {
      const output = execSync(`reg add "${key}" /v "${valueName}" /t REG_SZ /d "${value.replace(/"/g, '\\"')}" /f`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  writeDword(key, valueName, value) {
    log(`Writing registry DWORD: ${key}\\${valueName} = ${value}`);
    try {
      const output = execSync(`reg add "${key}" /v "${valueName}" /t REG_DWORD /d ${value} /f`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  deleteValue(key, valueName) {
    log(`Deleting registry value: ${key}\\${valueName}`);
    try {
      const output = execSync(`reg delete "${key}" /v "${valueName}" /f`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { RegistryManager };

if (require.main === module) {
  const reg = new RegistryManager();
  const result = reg.readKey('HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer');
  console.log(JSON.stringify(result, null, 2));
}
