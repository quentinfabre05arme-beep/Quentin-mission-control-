/**
 * 🎯 SELF-GOAL GENERATOR
 * Creates goals based on system analysis without user input
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── ANALYZE SYSTEM STATE ───────────────────────────────────
function analyzeState() {
  const ramPct = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  
  // Count files in workspace
  let fileCount = 0;
  try {
    const walk = (dir) => {
      fs.readdirSync(dir).forEach(f => {
        const fp = path.join(dir, f);
        try {
          if (fs.statSync(fp).isDirectory() && !f.startsWith('.') && f !== 'node_modules') {
            walk(fp);
          } else {
            fileCount++;
          }
        } catch(e) {}
      });
    };
    walk(process.cwd());
  } catch(e) {}
  
  return {
    ram_pct: ramPct,
    file_count: fileCount,
    uptime_hours: Math.floor(os.uptime() / 3600),
    disk_free_c: 0, // Would need wmic
    pending_git: 0,
    last_error: null
  };
}

// ─── GENERATE GOALS ─────────────────────────────────────────
function generateGoals() {
  const state = analyzeState();
  const goals = [];
  
  // RAM-based goals
  if (state.ram_pct > 90) {
    goals.push({
      priority: 'CRITICAL',
      goal: 'Reduce RAM usage below 90%',
      action: 'aggressive_cleanup',
      reasoning: `RAM at ${state.ram_pct}% — system at risk of crash`,
      auto_execute: true
    });
  } else if (state.ram_pct > 85) {
    goals.push({
      priority: 'HIGH',
      goal: 'Monitor RAM trend',
      action: 'log_ram_trend',
      reasoning: `RAM at ${state.ram_pct}% — trending high`,
      auto_execute: false
    });
  }
  
  // File-based goals
  if (state.file_count > 5000) {
    goals.push({
      priority: 'MEDIUM',
      goal: 'Archive old files',
      action: 'run_file_hygiene',
      reasoning: `${state.file_count} files — workspace getting bloated`,
      auto_execute: true
    });
  }
  
  // Uptime-based goals
  if (state.uptime_hours > 168) { // 7 days
    goals.push({
      priority: 'MEDIUM',
      goal: 'Restart gateway to clear memory',
      action: 'suggest_restart',
      reasoning: `Uptime ${state.uptime_hours}h — memory leaks accumulating`,
      auto_execute: false
    });
  }
  
  // Always add a learning goal
  goals.push({
    priority: 'LOW',
    goal: 'Review recent decisions for accuracy',
    action: 'review_decisions',
    reasoning: 'Improve signal quality over time',
    auto_execute: false
  });
  
  return goals;
}

// ─── EXECUTE AUTO-GOALS ─────────────────────────────────────
function executeGoals(goals) {
  const executed = [];
  
  goals.forEach(g => {
    if (g.auto_execute) {
      try {
        switch(g.action) {
          case 'aggressive_cleanup':
            try {
              // Run cleanup via RAM guard
              const os = require('os');
              Object.keys(require.cache).forEach(key => {
                if (key.includes('node_modules') && !key.includes('openclaw')) {
                  delete require.cache[key];
                }
              });
              if (global.gc) global.gc();
              executed.push(g);
            } catch(e) {}
            break;
            
          case 'run_file_hygiene':
            const h = require('./file_hygiene');
            h.runHygiene();
            executed.push(g);
            break;
            
          default:
            // Log for manual execution
            break;
        }
      } catch(e) {
        console.error(`❌ Auto-goal failed: ${g.goal}`, e.message);
      }
    }
  });
  
  return executed;
}

// ─── LOG GOALS ──────────────────────────────────────────────
function logGoals(goals, executed) {
  const logFile = path.join(__dirname, '..', 'logs', 'self_goals.jsonl');
  
  const entry = {
    timestamp: new Date().toISOString(),
    goals,
    executed: executed.map(g => g.goal),
    state: analyzeState()
  };
  
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  
  console.log(`🎯 Generated ${goals.length} goals, auto-executed ${executed.length}`);
}

// ─── MAIN ─────────────────────────────────────────────────
function run() {
  const goals = generateGoals();
  const executed = executeGoals(goals);
  logGoals(goals, executed);
  
  return { goals, executed };
}

module.exports = { generateGoals, executeGoals, run };

if (require.main === module) {
  run();
}
