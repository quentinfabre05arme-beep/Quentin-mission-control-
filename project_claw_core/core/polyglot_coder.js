/**
 * PROJECT CLAW CORE — Polyglot Coder
 * Execute code snippets in multiple languages.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'polyglot_coder.log');
const TEMP_DIR = path.join(__dirname, '..', 'data', 'polyglot');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class PolyglotCoder {
  constructor() {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  runJavaScript(code) {
    log('Running JavaScript snippet');
    try {
      const file = path.join(TEMP_DIR, `js_${Date.now()}.js`);
      fs.writeFileSync(file, code);
      const output = execSync(`node "${file}"`, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
      return { success: true, language: 'javascript', output: output.trim() };
    } catch(e) {
      return { success: false, language: 'javascript', error: e.message };
    }
  }
  
  runPython(code) {
    log('Running Python snippet');
    try {
      const file = path.join(TEMP_DIR, `py_${Date.now()}.py`);
      fs.writeFileSync(file, code);
      const output = execSync(`python "${file}"`, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
      return { success: true, language: 'python', output: output.trim() };
    } catch(e) {
      return { success: false, language: 'python', error: e.message };
    }
  }
  
  runPowerShell(code) {
    log('Running PowerShell snippet');
    try {
      const output = execSync(`powershell -c "${code.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 30000
      });
      return { success: true, language: 'powershell', output: output.trim() };
    } catch(e) {
      return { success: false, language: 'powershell', error: e.message };
    }
  }
  
  run(language, code) {
    if (language === 'javascript' || language === 'js') return this.runJavaScript(code);
    if (language === 'python' || language === 'py') return this.runPython(code);
    if (language === 'powershell' || language === 'ps') return this.runPowerShell(code);
    return { success: false, error: `Unsupported language: ${language}` };
  }
}

module.exports = { PolyglotCoder };

if (require.main === module) {
  const coder = new PolyglotCoder();
  console.log(coder.run('javascript', 'console.log("Hello from JS")'));
  console.log(coder.run('python', 'print("Hello from Python")'));
  console.log(coder.run('powershell', 'Write-Output "Hello from PS"'));
}
