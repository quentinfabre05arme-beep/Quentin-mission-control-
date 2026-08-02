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
  
  // Clear module cache for non-essential modules
  const essentialModules = ['fs', 'path', 'os', 'util', 'child_process'];
  Object.keys(require.cache).forEach(key => {
    if (!essentialModules.some(m => key.includes(m))) {
      delete require.cache[key];
    }
  });
  
  // Force V8 heap compaction if available
  if (global.gc) {
    global.gc();
  }
  
  const after = getRAMStatus();
  const saved = before.used_mb - after.used_mb;
  
  // Also try to drop V8 heap if possible
  try {
    const heapBefore = v8.getHeapStatistics();
    // Suggest GC to V8
    if (global.gc) global.gc();
    const heapAfter = v8.getHeapStatistics();
    const heapSaved = Math.round((heapBefore.used_heap_size - heapAfter.used_heap_size) / 1024 / 1024);
    if (heapSaved > 0) {
      console.log(`   💾 Heap freed: ${heapSaved}MB`);
    }
  } catch(e) {}
  
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
  
  return result;
}

// Run if called directly
if (require.main === module) {
  logCleanup();
}

module.exports = { cleanup, getRAMStatus, logCleanup };
