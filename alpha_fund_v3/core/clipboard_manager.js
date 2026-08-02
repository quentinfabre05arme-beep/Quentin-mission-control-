#!/usr/bin/env node
/**
 * 📋 CLIPBOARD MANAGER
 * History, search, persistence
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'clipboard_history.json');
const MAX_HISTORY = 50;

// ─── READ ─────────────────────────────────────────────────
function read() {
  try {
    const result = execSync('powershell -command "Get-Clipboard"', { encoding: 'utf8', windowsHide: true });
    return result.trim();
  } catch(e) {
    return '';
  }
}

// ─── WRITE ────────────────────────────────────────────────
function write(text) {
  try {
    execSync(
      `powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`,
      { windowsHide: true }
    );
    addToHistory(text);
    return true;
  } catch(e) {
    return false;
  }
}

// ─── HISTORY ────────────────────────────────────────────
function addToHistory(text) {
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
  
  history.unshift({
    text: text.substring(0, 1000),
    timestamp: new Date().toISOString()
  });
  
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }
  
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function getHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
  return [];
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { read, write, getHistory };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('📋 Clipboard Manager');
  console.log('');
  console.log('Current:', read().substring(0, 50) || '(empty)');
  console.log('History items:', getHistory().length);
  console.log('');
  console.log('Clipboard manager ready');
}
