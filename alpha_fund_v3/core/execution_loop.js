#!/usr/bin/env node
/**
 * 🤖 CLAW AUTONOMOUS EXECUTION LOOP
 * Runs all A+ engines in sequence without human input
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── LOAD ENGINES ─────────────────────────────────────────
const autonomy = require('./autonomy_engine');
const goals = require('./self_goal_generator');
const predictive = require('./predictive_maintenance');
const decisions = require('./decision_tracker');
const offline = require('./offline_mode');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  max_cycles_per_hour: 6,
  ram_critical_threshold: 93,
  log_file: path.join(__dirname, '..', 'logs', 'execution_loop.log'),
  state_file: path.join(__dirname, '..', 'logs', 'loop_state.json')
};

// ─── STATE ──────────────────────────────────────────────────
let state = {
  cycle_count: 0,
  last_cycle: null,
  errors: [],
  achievements: []
};

// ─── LOG ────────────────────────────────────────────────────
function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  fs.mkdirSync(path.dirname(CONFIG.log_file), { recursive: true });
  fs.appendFileSync(CONFIG.log_file, JSON.stringify(entry) + '\n');
  console.log(`[${level}] ${message}`);
}

// ─── SAVE STATE ─────────────────────────────────────────────
function saveState() {
  fs.writeFileSync(CONFIG.state_file, JSON.stringify(state, null, 2));
}

// ─── LOAD STATE ───────────────────────────────────────────
function loadState() {
  if (fs.existsSync(CONFIG.state_file)) {
    state = JSON.parse(fs.readFileSync(CONFIG.state_file, 'utf8'));
  }
}

// ─── PHASE 1: SELF-CHECK ──────────────────────────────────
function phaseSelfCheck() {
  log('INFO', '📊 Phase 1: Self-check');
  
  // RAM check
  const ramStatus = autonomy.checkRAM();
  log('INFO', `RAM: ${autonomy.state.ram_pct}% — ${ramStatus}`);
  
  if (autonomy.state.ram_pct >= CONFIG.ram_critical_threshold) {
    log('WARNING', 'RAM critical — skipping heavy phases');
    return false;
  }
  
  // Load state
  loadState();
  state.cycle_count++;
  state.last_cycle = new Date().toISOString();
  
  log('INFO', `Cycle #${state.cycle_count} starting`);
  return true;
}

// ─── PHASE 2: PREDICTIVE ─────────────────────────────────
function phasePredictive() {
  log('INFO', '🔮 Phase 2: Predictive maintenance');
  
  try {
    const result = predictive.run();
    
    if (result.action_required) {
      result.predictions.forEach(p => {
        log('WARNING', `Prediction: ${p.type} — ${p.prediction}`, p);
      });
      return { action: 'predictive_alert', predictions: result.predictions };
    }
    
    log('INFO', 'No critical predictions');
    return { action: 'none' };
  } catch(e) {
    log('ERROR', 'Predictive phase failed', { error: e.message });
    return { action: 'error' };
  }
}

// ─── PHASE 3: GOAL GENERATION ─────────────────────────────
function phaseGoals() {
  log('INFO', '🎯 Phase 3: Goal generation');
  
  try {
    const generatedGoals = goals.generateGoals();
    log('INFO', `Generated ${generatedGoals.length} goals`);
    
    // Log each goal
    generatedGoals.forEach(g => {
      const title = g.goal || g.title || 'Untitled goal';
      log('INFO', `Goal: ${title} (${g.priority} priority)`);
    });
    
    return { action: 'goals_generated', count: generatedGoals.length };
  } catch(e) {
    log('ERROR', 'Goal phase failed', { error: e.message });
    return { action: 'error' };
  }
}

// ─── PHASE 4: DECISION TRACKING ───────────────────────────
function phaseDecisions() {
  log('INFO', '📊 Phase 4: Decision tracking');
  
  try {
    const accuracy = decisions.getAccuracy();
    
    if (accuracy) {
      log('INFO', `Current accuracy: ${accuracy.overall_accuracy}% (${accuracy.total_decisions} decisions)`);
      
      // Track improvement
      if (accuracy.total_decisions > 10 && accuracy.overall_accuracy < 55) {
        log('WARNING', 'Accuracy below 55% — strategy may need adjustment');
      }
      
      return { action: 'accuracy_checked', accuracy: accuracy.overall_accuracy };
    }
    
    log('INFO', 'No decisions tracked yet');
    return { action: 'none' };
  } catch(e) {
    log('ERROR', 'Decision phase failed', { error: e.message });
    return { action: 'error' };
  }
}

// ─── PHASE 5: OFFLINE CHECK ───────────────────────────────
function phaseOffline() {
  log('INFO', '📴 Phase 5: Offline check');
  
  try {
    const result = offline.run();
    
    if (result.status === 'OFFLINE_MODE') {
      log('WARNING', 'Running in offline mode', { signals: result.signals.length });
      return { action: 'offline_mode', signals: result.signals.length };
    }
    
    log('INFO', 'Online — full capabilities available');
    return { action: 'online' };
  } catch(e) {
    log('ERROR', 'Offline phase failed', { error: e.message });
    return { action: 'error' };
  }
}

// ─── PHASE 6: SELF-REPORT ─────────────────────────────────
function phaseSelfReport() {
  log('INFO', '📡 Phase 6: Self-report');
  
  const report = {
    timestamp: new Date().toISOString(),
    cycle: state.cycle_count,
    ram_pct: autonomy.state.ram_pct,
    uptime_hours: Math.floor(os.uptime() / 3600),
    status: autonomy.state.status,
    paused: autonomy.state.paused
  };
  
  log('INFO', `Cycle #${state.cycle_count} complete`, report);
  state.achievements.push(`Cycle #${state.cycle_count} completed at ${new Date().toISOString()}`);
  
  // Keep only last 50 achievements
  if (state.achievements.length > 50) {
    state.achievements = state.achievements.slice(-50);
  }
  
  return { action: 'reported', report };
}

// ─── MAIN EXECUTION LOOP ────────────────────────────────────
function run() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║ 🤖 CLAW AUTONOMOUS EXECUTION LOOP ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  
  const startTime = Date.now();
  
  // Phase 1: Self-check
  const canProceed = phaseSelfCheck();
  
  if (!canProceed) {
    log('CRITICAL', 'Cannot proceed — system in emergency mode');
    saveState();
    return { status: 'emergency', reason: 'RAM critical or system error' };
  }
  
  // Phase 2-5: Core operations
  const results = {
    predictive: phasePredictive(),
    goals: phaseGoals(),
    decisions: phaseDecisions(),
    offline: phaseOffline()
  };
  
  // Phase 6: Report
  const report = phaseSelfReport();
  
  // Save state
  saveState();
  
  const duration = Date.now() - startTime;
  
  console.log('');
  console.log(`✅ Cycle #${state.cycle_count} complete in ${duration}ms`);
  console.log(`📊 RAM: ${autonomy.state.ram_pct}% | Status: ${autonomy.state.status}`);
  
  return {
    status: 'success',
    cycle: state.cycle_count,
    duration_ms: duration,
    ram_pct: autonomy.state.ram_pct,
    results
  };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run };

// ─── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const result = run();
  process.exit(result.status === 'success' ? 0 : 1);
}
