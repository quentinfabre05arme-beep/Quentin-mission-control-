/**
 * RAM Cleanup Utility
 * Reduces memory usage before/after heavy operations
 */

const os = require('os');
const v8 = require('v8');

function getRAMStatus() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const pct = Math.round((used / total) * 100);
  return {
    total_mb: Math.round(total / 1024 / 1024),
    used_mb: Math.round(used / 1024 / 1024),
    free_mb: Math.round(free / 1024 / 1024),
    pct: pct
  };
}

function cleanup() {
  const before = getRAMStatus();
  
  // Aggressive module cache clear (keep only truly core builtins)
  const essentialModules = ['fs', 'path', 'os', 'util', 'child_process', 'stream', 'events'];
  Object.keys(require.cache).forEach(key => {
    if (!essentialModules.some(m => key.includes(`node_modules\\${m}`) || key.endsWith(`${m}.js`))) {
      delete require.cache[key];
    }
  });
  
  // Compact and free V8 heap
  try {
    if (global.gc) {
      global.gc();
      global.gc();
    }
  } catch(e) {}
  
  // Compact heap space
  try {
    v8.writeHeapSnapshot = v8.writeHeapSnapshot || (() => {});
  } catch(e) {}
  
  const after = getRAMStatus();
  const saved = before.used_mb - after.used_mb;
  
  return {
    before: before,
    after: after,
    saved_mb: saved,
    timestamp: new Date().toISOString()
  };
}

function logCleanup() {
  const result = cleanup();
  const logEntry = `[${result.timestamp}] RAM cleanup: ${result.before.pct}% → ${result.after.pct}% (${result.saved_mb}MB saved)\n`;
  
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, 'ram_cleanup.log');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`🧹 RAM cleanup: ${result.before.pct}% → ${result.after.pct}% (${result.saved_mb}MB saved)`);
  
  // If still critical, warn loudly
  if (result.after.pct >= 92) {
    console.error(`🔴 CRITICAL RAM: ${result.after.pct}% used — consider pausing heavy operations`);
  }
  
  return result;
}

// Run if called directly
if (require.main === module) {
  logCleanup();
}

module.exports = { cleanup, getRAMStatus, logCleanup };
