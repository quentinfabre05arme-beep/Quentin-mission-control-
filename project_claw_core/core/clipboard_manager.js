/**
 * PROJECT CLAW CORE — Clipboard Manager
 * Read and write clipboard text.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'clipboard_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ClipboardManager {
  getText() {
    log('Reading clipboard text');
    try {
      const output = execSync('powershell -c "Get-Clipboard"', { encoding: 'utf8', windowsHide: true, timeout: 5000 });
      return { success: true, text: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  setText(text) {
    log('Writing clipboard text');
    try {
      execSync(`powershell -c "Set-Clipboard -Text '${text.replace(/'/g, "''")}'"`, { windowsHide: true, timeout: 5000 });
      return { success: true };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { ClipboardManager };

if (require.main === module) {
  const cm = new ClipboardManager();
  console.log(JSON.stringify(cm.getText(), null, 2));
}
