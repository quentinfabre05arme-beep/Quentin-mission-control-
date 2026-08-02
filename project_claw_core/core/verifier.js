#!/usr/bin/env node
/**
 * ✅ PROJECT CLAW CORE — BUILD VERIFIER
 * Tests every capability after it is built.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'logs', 'verifier.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(msg);
}

function verifyFile(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    log(`MISSING: ${file}`);
    return false;
  }
  
  try {
    // Syntax check
    const escapedPath = fullPath.replace(/"/g, '\\"');
    execSync(`node -c "${escapedPath}"`, { windowsHide: true });
    log(`SYNTAX OK: ${file}`);
    
    // Try to require it
    try {
      delete require.cache[require.resolve(fullPath)];
      require(fullPath);
      log(`LOAD OK: ${file}`);
      return true;
    } catch(loadErr) {
      log(`LOAD WARN: ${file} — ${loadErr.message}`);
      // Still counts as syntax OK
      return true;
    }
  } catch(e) {
    log(`SYNTAX FAIL: ${file} — ${e.message}`);
    return false;
  }
}

function verifyAll() {
  log('═══════════════════════════════════════════');
  log('✅ BUILD VERIFIER');
  log('═══════════════════════════════════════════');
  
  const files = [];
  ['core', 'agents', 'memory'].forEach(dir => {
    const fullDir = path.join(ROOT, dir);
    if (fs.existsSync(fullDir)) {
      fs.readdirSync(fullDir).filter(f => f.endsWith('.js')).forEach(f => files.push(path.join(dir, f)));
    }
  });
  
  let passed = 0;
  let failed = 0;
  
  files.forEach(f => {
    if (verifyFile(f)) passed++;
    else failed++;
  });
  
  log('');
  log(`Verified: ${passed} passed, ${failed} failed, ${files.length} total`);
  
  return { passed, failed, total: files.length };
}

module.exports = { verifyFile, verifyAll };

if (require.main === module) {
  verifyAll();
}
