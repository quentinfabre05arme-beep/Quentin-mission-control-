/**
 * Improvement Orchestrator v2
 * Runs the full autonomous self-improvement cycle with learning and self-review.
 */

const fs = require('fs');
const path = require('path');
const { log, saveJson, loadJson } = require('./utils');
const { loadLearning } = require('./learning_engine');

const CONFIG = require('../config.json');

const CapabilityProfiler = require('./capability_profiler');
const ImprovementRadar = require('./improvement_radar');
const HypothesisGenerator = require('./hypothesis_generator');
const ChangeGenerator = require('./change_generator');
const ExperimentRunner = require('./experiment_runner');
const { acquire } = require(path.join(CONFIG.workspace, 'project_claw_core', 'core', 'process_lock'));

const STATE_FILE = path.join(CONFIG.workspace, CONFIG.data_dir, 'improvement_state.json');
const LOCK_FILE = path.join(CONFIG.workspace, 'autonomous_improvement', 'logs', 'improvement.lock');

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) { return {}; }
  }
  return { cycles: 0, last_run: null, experiments: 0, successes: 0, failures: 0 };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function runCycle() {
  const state = loadState();
  state.cycles++;
  log(`=== IMPROVEMENT CYCLE #${state.cycles} ===`);

  const learning = loadLearning();

  // 1. Profile
  const profile = CapabilityProfiler.analyze();

  // 2. Research
  const knowledge = await ImprovementRadar.scan();

  // 3. Hypothesize
  const allHypotheses = HypothesisGenerator.generate();

  // 4. Pick top actionable hypothesis, skipping repeatedly-failed or already-applied ones
  let selected = null;
  let change = null;
  for (const h of allHypotheses) {
    const failures = learning.failures_by_title[h.title] || 0;
    if (failures >= 3) {
      log(`Skipping repeatedly-failed hypothesis: ${h.title} (${failures} failures)`);
      continue;
    }
    const candidate = ChangeGenerator.generate(h);
    if (candidate && candidate.alreadyApplied) {
      log(`Fix already applied: ${h.title}`);
      continue;
    }
    if (candidate) {
      selected = h;
      change = candidate;
      break;
    }
    log(`Could not generate change for: ${h.title}`, 'warn');
  }

  if (!selected || !change) {
    log('No actionable hypothesis this cycle');
    saveState(state);
    return { success: true, state, note: 'no_actionable_hypothesis' };
  }

  log(`Selected hypothesis: ${selected.title}`);

  // 6. Run experiment
  const experiment = await ExperimentRunner.runExperiment(selected, change);
  if (experiment.outcome === 'success' && experiment.status === 'committed') {
    state.successes++;
  } else {
    state.failures++;
  }

  state.last_run = new Date().toISOString();
  state.experiments++;
  saveState(state);

  log(`Cycle complete: ${experiment.outcome}`);
  return { success: experiment.outcome === 'success', state, experiment };
}

function startLoop(intervalMs = CONFIG.cycle_interval_ms) {
  log(`Starting improvement loop every ${intervalMs / 60000} minutes`);
  runCycle().then(() => {});
  setInterval(runCycle, intervalMs);
}

module.exports = { runCycle, startLoop };

if (require.main === module) {
  const mode = process.argv[2] || 'once';
  if (mode === 'loop') {
    if (!acquire(LOCK_FILE)) process.exit(0);
    startLoop();
  } else {
    if (!acquire(LOCK_FILE)) process.exit(0);
    runCycle().then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e);
      process.exit(1);
    });
  }
}
