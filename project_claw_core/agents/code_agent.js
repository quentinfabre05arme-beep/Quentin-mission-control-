/**
 * PROJECT CLAW CORE — Code Agent
 * Read codebase, write files, run tests.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'code_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function readCodebase(dir, pattern = /\.js$/, maxFiles = 50) {
  log(`Reading codebase: ${dir}`);
  const results = [];
  
  function walk(current) {
    if (results.length >= maxFiles) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          results.push({ path: fullPath, size: content.length, preview: content.slice(0, 500) });
        } catch(e) {}
      }
    }
  }
  
  walk(dir);
  return results;
}

function writeFile(filePath, content) {
  log(`Writing file: ${filePath}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return { success: true, path: filePath };
}

function runTests(command, cwd) {
  log(`Running tests: ${command}`);
  try {
    const output = execSync(command, { cwd, encoding: 'utf8', windowsHide: true, timeout: 120000 });
    return { success: true, output };
  } catch(e) {
    return { success: false, error: e.message, output: e.stdout || '' };
  }
}

function syntaxCheck(filePath) {
  try {
    execSync(`node -c "${filePath}"`, { windowsHide: true });
    return { valid: true };
  } catch(e) {
    return { valid: false, error: e.message };
  }
}

class CodeAgent {
  constructor() {}
  
  read(dir, pattern, maxFiles) {
    return readCodebase(dir, pattern, maxFiles);
  }
  
  write(file, code) {
    return writeFile(file, code);
  }
  
  test(cmd, cwd) {
    return runTests(cmd, cwd);
  }
  
  validate(file) {
    return syntaxCheck(file);
  }
  analyzeProject(file) {
    const stat = fs.statSync(file);
    return stat.isDirectory() ? this.read(file, undefined, 50) : this.read(path.dirname(file), undefined, 50);
  }
}

module.exports = { CodeAgent, readCodebase, writeFile, runTests, syntaxCheck };
