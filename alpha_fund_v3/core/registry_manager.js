#!/usr/bin/env node
/**
 * 🛡️ REGISTRY MANAGER
 * Read/write Windows registry
 */

const { execSync } = require('child_process');
const fs = require('fs');

// ─── READ ─────────────────────────────────────────────────
function read(path, name) {
  try {
    const result = execSync(
      `reg query "${path}" /v "${name}" 2>nul`,
      { encoding: 'utf8', windowsHide: true }
    );
    const match = result.match(/REG_\w+\s+(\S.*\S|\S)\s*$/m);
    return { success: true, value: match ? match[1] : null };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── WRITE ──────────────────────────────────────────────
function write(path, name, value, type = 'REG_SZ') {
  try {
    execSync(
      `reg add "${path}" /v "${name}" /t ${type} /d "${value}" /f`,
      { windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── DELETE ───────────────────────────────────────────────
function del(path, name) {
  try {
    execSync(
      `reg delete "${path}" /v "${name}" /f`,
      { windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── LIST ─────────────────────────────────────────────────
function list(path) {
  try {
    const result = execSync(
      `reg query "${path}" 2>nul`,
      { encoding: 'utf8', windowsHide: true }
    );
    const lines = result.split('\n').filter(l => l.includes('REG_'));
    return {
      success: true,
      values: lines.map(l => {
        const parts = l.trim().split(/\s{2,}/);
        return { name: parts[0], type: parts[1], value: parts[2] };
      })
    };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { read, write, delete: del, list };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🛡️ Registry Manager');
  console.log('');
  
  // Test read
  const testPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  const result = list(testPath);
  
  if (result.success) {
    console.log('Auto-start entries:', result.values.length);
    result.values.slice(0, 5).forEach(v => {
      console.log(`  ${v.name}: ${v.value?.substring(0, 50) || 'N/A'}`);
    });
  }
  
  console.log('');
  console.log('Registry manager ready');
}
