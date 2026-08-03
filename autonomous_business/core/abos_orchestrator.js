/**
 * Autonomous Business Operation System — Main Orchestrator
 * 24/7 CEO-as-employee engine.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = require('../config.json');
const LOG_FILE = path.join(CONFIG.workspace, CONFIG.log_file);
const STATE_FILE = path.join(CONFIG.workspace, 'autonomous_business/data/abos_state.json');
const LOCK_FILE = path.join(CONFIG.workspace, 'autonomous_business', 'logs', 'abos.lock');

const { acquire } = require(path.join(CONFIG.workspace, 'project_claw_core', 'core', 'process_lock'));

const OpportunityRadar = require('./opportunity_radar');
const AutonomousResearcher = require('./autonomous_researcher');
const BuildExecutor = require('./build_executor');
const ShipAndMeasure = require('./ship_and_measure');
const DailyCEOReport = require('./daily_ceo_report');

const DEAD_LETTER_FILE = path.join(CONFIG.workspace, 'autonomous_business', 'data', 'abos_dead_letter.json');

function loadDeadLetter() {
  if (fs.existsSync(DEAD_LETTER_FILE)) {
    try { return JSON.parse(fs.readFileSync(DEAD_LETTER_FILE, 'utf8')); } catch(e) { return []; }
  }
  return [];
}

function saveDeadLetter(queue) {
  fs.mkdirSync(path.dirname(DEAD_LETTER_FILE), { recursive: true });
  fs.writeFileSync(DEAD_LETTER_FILE, JSON.stringify(queue.slice(-100), null, 2));
}

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[ABOS] ${msg}`);
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) { return {}; }
  }
  return { cycles: 0, last_run: null };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

class ABOSOrchestrator {
  constructor() {
    this.state = loadState();
  }

  async runCycle(reportTarget = null) {
    log(`=== ABOS CYCLE #${this.state.cycles + 1} ===`);
    const start = Date.now();
    const actions = [];
    const deadLetter = loadDeadLetter();

    const runStep = async (name, fn) => {
      try {
        const result = await fn();
        actions.push({ step: name, success: true, ...result });
        return result;
      } catch(e) {
        log(`${name} failed: ${e.message}`, 'error');
        const record = { step: name, error: e.message, timestamp: new Date().toISOString(), retries: 0 };
        const existing = deadLetter.find(d => d.step === name && d.error === e.message);
        if (existing) existing.retries++;
        else deadLetter.push(record);
        saveDeadLetter(deadLetter);
        actions.push({ step: name, success: false, error: e.message });
        return null;
      }
    };

    try {
      log('Step 1: Opportunity radar');
      const radar = await runStep('radar', () => OpportunityRadar.run());
      if (radar) actions.find(a =>a.step === 'radar').backlog_count = radar.backlog_count;

      log('Step 2: Autonomous research');
      const research = await runStep('research', () => AutonomousResearcher.researchTop());
      if (research) actions.find(a =>a.step === 'research').validated = research.filter(r => r.success && r.opportunity.validated).length;

      log('Step 3: Build executor');
      const builds = await runStep('build', () => BuildExecutor.buildTop());
      if (builds) actions.find(a =>a.step === 'build').built = builds.filter(r => r.success).length;

      log('Step 4: Ship and measure');
      const shipped = await runStep('ship', () => ShipAndMeasure.run());
      if (shipped) {
        const shipAction = actions.find(a =>a.step === 'ship');
        shipAction.metrics = shipped.metrics;
        shipAction.git = shipped.git.success;
      }

      if (reportTarget) {
        log('Step 5: CEO report');
        const report = DailyCEOReport.formatReport('morning');
        try {
          const { message } = require(path.join(CONFIG.workspace, 'project_claw_core/core/telegram_helper'));
          await message({ action: 'send', target: reportTarget, channel: 'telegram', message: report });
          actions.push({ step: 'report', sent: true });
        } catch(e) {
          actions.push({ step: 'report', sent: false, error: e.message });
        }
      }

      this.state.cycles++;
      this.state.last_run = new Date().toISOString();
      this.state.duration_ms = Date.now() - start;
      this.state.actions = actions.slice(-20);
      this.state.dead_letter_count = deadLetter.length;
      saveState(this.state);

      log(`Cycle complete in ${this.state.duration_ms}ms`);
      return { success: true, state: this.state };
    } catch(e) {
      log(`Cycle failed: ${e.message}`, 'error');
      actions.push({ step: 'error', error: e.message });
      saveState(this.state);
      return { success: false, error: e.message, actions };
    }
  }

  startLoop(intervalMs = 3600000, reportTarget = null) {
    log(`Starting ABOS loop every ${intervalMs / 60000} minutes`);
    this.runCycle(reportTarget);
    setInterval(() => this.runCycle(reportTarget), intervalMs);
  }
}

module.exports = { ABOSOrchestrator };

if (require.main === module) {
  const mode = process.argv[2] || 'once';
  const orch = new ABOSOrchestrator();
  if (mode === 'loop') {
    if (!acquire(LOCK_FILE)) process.exit(0);
    const interval = parseInt(process.argv[3], 10) || 3600000;
    const target = process.argv[4] || null;
    orch.startLoop(interval, target);
  } else {
    if (!acquire(LOCK_FILE)) process.exit(0);
    orch.runCycle(process.argv[3]).then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e);
      process.exit(1);
    });
  }
}
