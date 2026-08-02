/**
 * Autonomous Business Operation System — Main Orchestrator
 * 24/7 CEO-as-employee engine.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = require('../config.json');
const LOG_FILE = path.join(CONFIG.workspace, CONFIG.log_file);
const STATE_FILE = path.join(CONFIG.workspace, 'autonomous_business/data/abos_state.json');

const OpportunityRadar = require('./opportunity_radar');
const AutonomousResearcher = require('./autonomous_researcher');
const BuildExecutor = require('./build_executor');
const ShipAndMeasure = require('./ship_and_measure');
const DailyCEOReport = require('./daily_ceo_report');

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

    try {
      // 1. Scan opportunities
      log('Step 1: Opportunity radar');
      const radar = await OpportunityRadar.run();
      actions.push({ step: 'radar', backlog_count: radar.backlog_count, top: radar.top.map(t => t.id) });

      // 2. Research top unvalidated
      log('Step 2: Autonomous research');
      const research = await AutonomousResearcher.researchTop();
      actions.push({ step: 'research', validated: research.filter(r => r.success && r.opportunity.validated).length });

      // 3. Build validated
      log('Step 3: Build executor');
      const builds = await BuildExecutor.buildTop();
      actions.push({ step: 'build', built: builds.filter(r => r.success).length });

      // 4. Ship + measure
      log('Step 4: Ship and measure');
      const shipped = await ShipAndMeasure.run();
      actions.push({ step: 'ship', metrics: shipped.metrics, git: shipped.git.success });

      // 5. Report if target provided
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
      this.state.actions = actions;
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
    const interval = parseInt(process.argv[3], 10) || 3600000;
    const target = process.argv[4] || null;
    orch.startLoop(interval, target);
  } else {
    orch.runCycle(process.argv[3]).then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e);
      process.exit(1);
    });
  }
}
