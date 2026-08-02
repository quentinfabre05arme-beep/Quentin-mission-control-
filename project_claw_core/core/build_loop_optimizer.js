/**
 * PROJECT CLAW CORE — Build Loop Optimizer
 * Analyze and optimize the build loop performance.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'build_loop_optimizer.log');
const BUILD_LOG = path.join(__dirname, '..', 'logs', 'build_loop.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class BuildLoopOptimizer {
  analyze() {
    log('Analyzing build loop');
    const stats = {
      total_build_time_ms: null,
      average_cycle_time_ms: null,
      capabilities_per_minute: null,
      failures: 0
    };
    
    if (fs.existsSync(BUILD_LOG)) {
      const lines = fs.readFileSync(BUILD_LOG, 'utf8').split('\n').filter(Boolean);
      const cycles = lines.map(l => {
        try { return JSON.parse(l); } catch(e) { return null; }
      }).filter(Boolean);
      
      if (cycles.length > 0) {
        const times = cycles.map(c => c.duration_ms || 0).filter(t => t > 0);
        const total = times.reduce((a, b) => a + b, 0);
        stats.total_build_time_ms = total;
        stats.average_cycle_time_ms = total / times.length;
        const capsBuilt = cycles.reduce((a, c) => a + (c.capabilities_built || 0), 0);
        stats.capabilities_per_minute = capsBuilt / (total / 60000);
        stats.failures = cycles.filter(c => !c.success).length;
      }
    }
    
    return { success: true, stats };
  }
  
  recommend() {
    const { stats } = this.analyze();
    const recommendations = [];
    if (stats.capabilities_per_minute < 5) recommendations.push('Increase batch size to reduce overhead');
    if (stats.failures > 0) recommendations.push('Add pre-flight verification before commit');
    if (stats.average_cycle_time_ms > 60000) recommendations.push('Parallelize independent capability builds');
    if (recommendations.length === 0) recommendations.push('Build loop is performing well');
    return { success: true, recommendations };
  }
}

module.exports = { BuildLoopOptimizer };

if (require.main === module) {
  const optimizer = new BuildLoopOptimizer();
  console.log(JSON.stringify(optimizer.recommend(), null, 2));
}
