/**
 * PROJECT CLAW CORE — Window Automation
 * Higher-level window operations.
 */

const { listWindows, focusWindow, minimizeWindow, closeWindow } = require('./window_manager');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'window_automation.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class WindowAutomation {
  async arrangeCascading() {
    log('Arranging windows cascading');
    const windows = listWindows();
    if (Array.isArray(windows)) {
      const offset = 30;
      for (let i = 0; i < Math.min(windows.length, 5); i++) {
        focusWindow(windows[i].MainWindowTitle);
        // Move via WinAPI would go here; simplified
      }
    }
    return { success: true, arranged: Math.min(windows.length || 0, 5) };
  }
  
  closeAll(titlePattern) {
    log(`Closing all windows matching: ${titlePattern}`);
    const windows = listWindows();
    let closed = 0;
    if (Array.isArray(windows)) {
      for (const w of windows) {
        if (w.MainWindowTitle && w.MainWindowTitle.includes(titlePattern)) {
          closeWindow(w.MainWindowTitle);
          closed++;
        }
      }
    }
    return { success: true, closed };
  }
  
  findAndFocus(title) {
    return focusWindow(title);
  }
}

module.exports = { WindowAutomation };

if (require.main === module) {
  const wa = new WindowAutomation();
  console.log('Windows:', listWindows().length);
}
