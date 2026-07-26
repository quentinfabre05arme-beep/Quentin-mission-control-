// Continuous Memory Updater
// Ensures memory is updated every moment

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, 'memory');
const UPDATE_INTERVAL = 60000; // 1 minute

class ContinuousMemoryUpdater {
  constructor() {
    this.running = false;
    this.updates = 0;
    this.startTime = Date.now();
  }

  // Continuous update cycle
  start() {
    if (this.running) return;
    this.running = true;
    
    console.log('Continuous memory updater started');
    console.log('Updating every', UPDATE_INTERVAL / 1000, 'seconds');
    
    // Update immediately
    this.update();
    
    // Then update continuously
    this.interval = setInterval(() => {
      this.update();
    }, UPDATE_INTERVAL);
  }

  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    console.log('Continuous memory updater stopped');
  }

  update() {
    this.updates++;
    const now = new Date().toISOString();
    
    // 1. Update timestamp
    this.saveTimestamp(now);
    
    // 2. Update session stats
    this.updateSessionStats(now);
    
    // 3. Update memory log
    this.logUpdate(now);
    
    // 4. Verify all files exist
    this.verifyFiles();
    
    // 5. Update global memory
    this.updateGlobalMemory(now);
  }

  saveTimestamp(now) {
    const timestampFile = path.join(MEMORY_DIR, 'last_update.json');
    fs.writeFileSync(timestampFile, JSON.stringify({
      timestamp: now,
      updates: this.updates,
      uptime: Date.now() - this.startTime
    }, null, 2));
  }

  updateSessionStats(now) {
    const statsFile = path.join(MEMORY_DIR, 'session_stats.json');
    const stats = {
      session: this.getSessionId(),
      startTime: new Date(this.startTime).toISOString(),
      currentTime: now,
      updates: this.updates,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memory: process.memoryUsage()
    };
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  }

  logUpdate(now) {
    const logFile = path.join(MEMORY_DIR, 'update_log.jsonl');
    const entry = {
      timestamp: now,
      update: this.updates,
      uptime: Date.now() - this.startTime,
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  }

  verifyFiles() {
    const requiredFiles = [
      'global_memory.json',
      'skill_index.json',
      'performance_log.jsonl',
      'improvements.jsonl',
      'universal_memory.jsonl',
      'knowledge_graph.json'
    ];
    
    const status = {};
    for (const file of requiredFiles) {
      const filePath = path.join(MEMORY_DIR, file);
      status[file] = fs.existsSync(filePath);
    }
    
    const statusFile = path.join(MEMORY_DIR, 'file_status.json');
    fs.writeFileSync(statusFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      files: status,
      allExist: Object.values(status).every(Boolean)
    }, null, 2));
  }

  updateGlobalMemory(now) {
    const globalFile = path.join(MEMORY_DIR, 'global_memory.json');
    let global = { sessions: 0, totalImprovements: 0, skills: [] };
    
    if (fs.existsSync(globalFile)) {
      try {
        global = JSON.parse(fs.readFileSync(globalFile, 'utf8'));
      } catch(e) {}
    }
    
    global.lastUpdate = now;
    global.updates = this.updates;
    global.uptime = Date.now() - this.startTime;
    
    fs.writeFileSync(globalFile, JSON.stringify(global, null, 2));
  }

  getSessionId() {
    return 'session_' + this.startTime;
  }

  getStatus() {
    return {
      running: this.running,
      updates: this.updates,
      uptime: Date.now() - this.startTime,
      lastUpdate: fs.existsSync(path.join(MEMORY_DIR, 'last_update.json'))
        ? JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, 'last_update.json'), 'utf8')).timestamp
        : null
    };
  }
}

module.exports = ContinuousMemoryUpdater;

// CLI
if (require.main === module) {
  const updater = new ContinuousMemoryUpdater();
  
  const command = process.argv[2];
  
  if (command === 'start') {
    console.log('Starting continuous memory updater...\n');
    updater.start();
    
    // Show status every 10 seconds
    setInterval(() => {
      const status = updater.getStatus();
      console.log('[' + new Date().toISOString().split('T')[1].split('.')[0] + ']', 
        'Updates:', status.updates, 
        '| Uptime:', Math.round(status.uptime / 1000) + 's',
        '| Running:', status.running ? 'YES' : 'NO');
    }, 10000);
    
    // Stop after 1 minute (for testing)
    setTimeout(() => {
      updater.stop();
      console.log('\nFinal status:', updater.getStatus());
      process.exit(0);
    }, 60000);
    
  } else if (command === 'status') {
    console.log(JSON.stringify(updater.getStatus(), null, 2));
  } else {
    console.log('Usage: node continuous_memory.js [start|status]');
  }
}
