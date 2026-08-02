/**
 * PROJECT CLAW CORE — Test Runner
 * Run test suites and collect results.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'test_runner.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class TestRunner {
  runNodeTest(filePath) {
    log(`Running Node test: ${filePath}`);
    try {
      const output = execSync(`node "${filePath}"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 60000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message, output: e.stdout || '' };
    }
  }
  
  runNpmTest(cwd) {
    log(`Running npm test in ${cwd}`);
    try {
      const output = execSync('npm test', {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 120000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message, output: e.stdout || '' };
    }
  }
  
  runCommand(command, cwd = process.cwd(), timeout = 60000) {
    log(`Running command: ${command}`);
    try {
      const output = execSync(command, {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
        timeout
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message, output: e.stdout || '' };
    }
  }
  
  runCapabilityTests(capabilityDir, pattern = /\.js$/) {
    log(`Running all capability tests in ${capabilityDir}`);
    const results = [];
    const files = fs.readdirSync(capabilityDir).filter(f => pattern.test(f));
    for (const file of files) {
      const filePath = path.join(capabilityDir, file);
      const result = this.runNodeTest(filePath);
      results.push({ file, ...result });
    }
    const passed = results.filter(r => r.success).length;
    return { total: results.length, passed, failed: results.length - passed, results };
  }
}

module.exports = { TestRunner };

if (require.main === module) {
  const runner = new TestRunner();
  const result = runner.runNodeTest('project_claw_core/core/health_dashboard.js');
  console.log(JSON.stringify(result, null, 2));
}
