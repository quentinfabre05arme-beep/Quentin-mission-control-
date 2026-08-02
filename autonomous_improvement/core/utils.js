const fs = require('fs');
const path = require('path');

const CONFIG = require('../config.json');

function log(msg, level = 'info') {
  const entry = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  const logFile = path.join(CONFIG.workspace, CONFIG.log_file);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, entry);
}

function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return null; }
}

function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ]);
}

module.exports = { log, loadJson, saveJson, runWithTimeout };
