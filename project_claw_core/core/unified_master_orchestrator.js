/**
 * UNIFIED MASTER ORCHESTRATOR v2.1
 * Integrates Alpha Fund v3.0 + Project Claw Core into one autonomous workflow.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = 'C:\\Users\\quent\\.openclaw\\workspace';
const LOG_FILE = path.join(WORKSPACE, 'project_claw_core', 'logs', 'unified_master.log');
const STATE_FILE = path.join(WORKSPACE, 'project_claw_core', 'data', 'unified_master_state.json');

// Load Alpha Fund
const AlphaFund = require(path.join(WORKSPACE, 'alpha_fund_v3', 'orchestrator'));
const { ClawWorkflows } = require(path.join(WORKSPACE, 'alpha_fund_v3', 'utils', 'claw_workflows'));

// Load Smart Brain for model routing
let SmartBrain = null;
try {
  SmartBrain = require(path.join(WORKSPACE, 'missions', 'smart_brain', 'orchestrator'));
} catch (e) {
  log(`Smart Brain not loaded: ${e.message}`, 'warn');
}

// Load new 2026 modules
let CapabilityRouter = null;
let CapabilityTracker = null;
let MemoryTier = null;
let Planner = null;
try {
  CapabilityRouter = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'capability_router'));
  CapabilityTracker = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'capability_usage_tracker'));
  MemoryTier = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'memory_tier'));
  Planner = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'hierarchical_planner'));
} catch (e) {
  log(`New 2026 modules not loaded: ${e.message}`, 'warn');
}

function log(msg, level = 'info') {
  const entry = { timestamp: new Date().toISOString(), level, message: msg };
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  console.log(`[${level.toUpperCase()}] ${msg}`);
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) { return {}; }
  }
  return { cycles: 0, last_cycle: null, issues: [], actions: [] };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function runWithTimeout(fn, ms = 15000, label = 'operation') {
  return Promise.race([
    Promise.resolve(fn()).catch(e => ({ success: false, error: e.message })),
    new Promise(resolve => setTimeout(() => resolve({ success: false, error: `${label} timed out after ${ms}ms` }), ms))
  ]);
}

class UnifiedMasterOrchestrator {
  constructor() {
    this.state = loadState();
    this.workflows = new ClawWorkflows();
    this.brain = SmartBrain ? new SmartBrain() : null;
  }

  routeTask(task) {
    if (!this.brain) return { modelId: null, modelName: 'default', confidence: 0 };
    try {
      const routing = this.brain.executeTask(task);
      return {
        modelId: routing.assignedModel?.id || null,
        modelName: routing.assignedModel?.name || 'unknown',
        role: routing.assignedModel?.role || 'general',
        confidence: routing.analysis?.confidence || 0,
        category: routing.analysis?.category || 'general'
      };
    } catch (e) {
      log(`Smart Brain routing failed: ${e.message}`, 'warn');
      return { modelId: null, modelName: 'default', confidence: 0, error: e.message };
    }
  }

  async runModelRouting() {
    log('Step: Smart Brain model routing');
    const tasks = [
      'Generate daily market report',
      'Analyze BTC price trend',
      'Debug Node.js memory issue',
      'Plan autonomous system improvements'
    ];
    const routing = [];
    for (const task of tasks) {
      const r = await runWithTimeout(() => this.routeTask(task), 3000, 'smart_brain_route');
      routing.push({ task, ...r });
    }
    log(`Smart Brain routed ${routing.length} sample tasks`);
    return routing;
  }

  async runCapabilityRouterCheck() {
    log('Step: Capability router + usage tracker');
    const sampleTasks = [
      'send status report',
      'check system health',
      'research BTC news',
      'backup git repository'
    ];
    const routes = [];
    for (const task of sampleTasks) {
      try {
        const start = Date.now();
        const r = CapabilityRouter.route(task);
        CapabilityTracker.track(r.capability, { success: !!r.capability, latencyMs: Date.now() - start });
        routes.push(r);
      } catch (e) {
        routes.push({ task, error: e.message });
      }
    }
    const health = CapabilityTracker.getHealth();
    log(`Capability router: ${routes.length} routes, ${health.unhealthy.length} unhealthy`);
    return { routes, health };
  }

  async runMemoryTierCheck() {
    log('Step: Memory tier query');
    try {
      const results = MemoryTier.search('health status', { topK: 3 });
      log(`Memory tier returned ${results.length} hits`);
      return { success: true, hits: results.length };
    } catch (e) {
      log(`Memory tier error: ${e.message}`, 'warn');
      return { success: false, error: e.message };
    }
  }

  async runPlannerCheck() {
    log('Step: Hierarchical planner');
    try {
      const healthCheck = await runWithTimeout(() => this.workflows.orch.healthCheck(), 15000, 'health_for_planner');
      const next = Planner.pickNextTask({ ram: healthCheck?.metrics?.ramUsedPct || 80, cpu: 40 });
      log(`Planner next action: ${next.action}`);
      return next;
    } catch (e) {
      log(`Planner error: ${e.message}`, 'warn');
      return { action: 'error', error: e.message };
    }
  }
  
  async runResearch(query = 'BTC crypto market news today') {
    log(`Step: Market research — ${query}`);
    try {
      const research = await runWithTimeout(
        () => this.workflows.orch.runCommand('research_agent research', [query, 5]),
        30000,
        'research'
      );
      if (!research || !research.success) {
        log(`Research failed: ${research?.error || 'unknown'}`, 'warn');
        return { success: false, error: research?.error || 'unknown' };
      }
      return research;
    } catch(e) {
      log(`Research exception: ${e.message}`, 'error');
      return { success: false, error: e.message };
    }
  }
  
  async generateReport() {
    const { CapabilityInvoker } = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'capability_invoker'));
    const invoker = new CapabilityInvoker();

    let health = { success: false, result: {} };
    let fund = { total_value: 0, return_pct: 0, mode: 'unknown' };
    let audit = { real: 0, stubs: 0, syntax_errors: 0 };
    let market = {};

    try {
      health = await runWithTimeout(() => invoker.invoke('system_health_monitor', 'getHealth', []), 10000, 'health_report');
    } catch (e) { health = { success: false, error: e.message }; }

    try {
      fund = await runWithTimeout(() => AlphaFund.COMMANDS.status(['--json']), 5000, 'fund_report');
    } catch (e) { fund = { total_value: 0, return_pct: 0, mode: 'error', error: e.message }; }

    try {
      const auditRaw = await runWithTimeout(() => invoker.invoke('self_audit', 'run', []), 10000, 'audit_report');
      if (auditRaw.success && auditRaw.result && auditRaw.result.summary) {
        audit = auditRaw.result.summary;
      }
    } catch (e) { audit.error = e.message; }

    try {
      const btc = await runWithTimeout(() => invoker.invoke('market_watcher', 'getTrend', ['BTC']), 10000, 'btc_report');
      const eth = await runWithTimeout(() => invoker.invoke('market_watcher', 'getTrend', ['ETH']), 10000, 'eth_report');
      market = { btc: btc.result, eth: eth.result };
    } catch (e) { market.error = e.message; }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      cycle: this.state.cycles,
      health: health.result || health,
      fund,
      audit,
      market
    };
  }

  async runCycle(reportTarget = null) {
    log(`=== UNIFIED CYCLE #${this.state.cycles + 1} ===`);
    const start = Date.now();
    const actions = [];
    let report = null;

    try {
      log('Step 1: System health');
      const healthCheck = await runWithTimeout(() => this.workflows.orch.healthCheck(), 15000, 'health_check');
      actions.push({ step: 'health_check', healthy: healthCheck.healthy, issues: healthCheck.issues });

      if (!healthCheck.healthy) {
        log('Health issues detected, running self-healing', 'warn');
        const cleanup = await runWithTimeout(() => this.workflows.orch.runCommand('predictive_maintenance run'), 20000, 'self_heal');
        actions.push({ step: 'predictive_maintenance', result: cleanup.success });
        try {
          const rc = require(path.join(WORKSPACE, 'alpha_fund_v3', 'scripts', 'ram_cleanup'));
          const before = await runWithTimeout(() => rc.cleanup(), 20000, 'ram_cleanup');
          actions.push({ step: 'ram_cleanup', saved_mb: before.saved_mb, after_pct: before.after.pct });
        } catch(e) {
          actions.push({ step: 'ram_cleanup', error: e.message });
        }
      }

      log('Step 2: Alpha Fund status');
      const fundStatus = await runWithTimeout(() => AlphaFund.COMMANDS.status(['--json']), 5000, 'fund_status');
      actions.push({ step: 'fund_status', total_value: fundStatus.total_value, return_pct: fundStatus.total_return_pct });

      log('Step 2b: Smart Brain model routing');
      const routing = await this.runModelRouting();
      actions.push({ step: 'smart_brain_routing', routes: routing.length, sample: routing.slice(0, 2) });

      const research = await this.runResearch();
      actions.push({ step: 'research', success: research.success, result_size: research.result ? JSON.stringify(research.result).length : 0 });

      log('Step 2c: Capability router + usage tracker');
      const capCheck = await this.runCapabilityRouterCheck();
      actions.push({ step: 'capability_router', routes: capCheck.routes.length, unhealthy: capCheck.health.unhealthy.length });

      log('Step 2d: Memory tier');
      const memCheck = await this.runMemoryTierCheck();
      actions.push({ step: 'memory_tier', ...memCheck });

      log('Step 2e: Hierarchical planner');
      const plannerCheck = await this.runPlannerCheck();
      actions.push({ step: 'hierarchical_planner', ...plannerCheck });

      log('Step 3: Market watcher');
      const btcTrend = await runWithTimeout(() => this.workflows.orch.runCommand('market_watcher getTrend', ['BTC']), 10000, 'btc_trend');
      const ethTrend = await runWithTimeout(() => this.workflows.orch.runCommand('market_watcher getTrend', ['ETH']), 10000, 'eth_trend');
      actions.push({ step: 'market_watch', btc: btcTrend.result, eth: ethTrend.result });

      log('Step 4: Self audit');
      const audit = await runWithTimeout(() => this.workflows.orch.runCommand('self_audit run'), 20000, 'self_audit');
      const auditSummary = audit.success && audit.result && audit.result.summary ? audit.result.summary : { real: 0, stubs: 0, syntax_errors: 0 };
      actions.push({ step: 'self_audit', real: auditSummary.real, stubs: auditSummary.stubs, syntax_errors: auditSummary.syntax_errors });

      log('Step 5: Git backup');
      const gitStatus = await runWithTimeout(() => this.workflows.orch.runCommand('git_agent status'), 10000, 'git_status');
      const hasChanges = gitStatus.result && (gitStatus.result.has_changes || gitStatus.result.ahead || gitStatus.result.modified > 0);
      if (hasChanges) {
        const commit = await runWithTimeout(() => this.workflows.orch.runCommand('git_agent autoCommitPush', ['Auto: Unified master cycle']), 30000, 'git_backup');
        actions.push({ step: 'git_backup', success: commit.success });
      } else {
        actions.push({ step: 'git_backup', note: 'no changes' });
      }

      if (reportTarget) {
        log('Step 6: Telegram report');
        report = await runWithTimeout(() => this.generateReport(), 15000, 'generate_report');
        try {
          const { message } = require('./telegram_helper');
          await runWithTimeout(() => message({ action: 'send', target: reportTarget, channel: 'telegram', message: formatReport(report) }), 10000, 'telegram_send');
          actions.push({ step: 'telegram_report', sent: true });
        } catch (e) {
          log(`Telegram report failed: ${e.message}`, 'warn');
          actions.push({ step: 'telegram_report', sent: false, error: e.message });
        }
      }

      this.state.cycles++;
      this.state.last_cycle = new Date().toISOString();
      this.state.actions = actions.slice(-20);
      this.state.duration_ms = Date.now() - start;
      saveState(this.state);

      log(`Cycle complete in ${this.state.duration_ms}ms`);
      return { success: true, state: this.state, report };
    } catch(e) {
      log(`Cycle failed: ${e.message}`, 'error');
      actions.push({ step: 'error', error: e.message });
      saveState(this.state);
      return { success: false, error: e.message, actions, report };
    }
  }
  
  async status() {
    return {
      success: true,
      cycles: this.state.cycles,
      last_cycle: this.state.last_cycle,
      duration_ms: this.state.duration_ms
    };
  }
  
  async runOnce() {
    return await this.runCycle();
  }
  
  startLoop(intervalMs = 600000, reportTarget = null) {
    log(`Starting unified master loop every ${intervalMs / 60000} minutes`);
    this.runCycle(reportTarget);
    const timer = setInterval(() => this.runCycle(reportTarget), intervalMs);
    timer.unref = () => {};
  }
}

function formatReport(r) {
  const h = r.health || {};
  const f = r.fund || {};
  const a = r.audit || {};
  const m = r.market || {};
  return [
    `🐾 Claw Cycle #${r.cycle} — ${new Date(r.timestamp).toLocaleString('fr-FR')}`,
    ``,
    `💰 Alpha Fund: ${f.total_value || 0} (${f.total_return_pct || 0}%)`,
    `🧠 Capabilities: ${a.real || 0} real, ${a.stubs || 0} stubs`,
    `📈 BTC: ${m.btc?.signal || 'N/A'} | ETH: ${m.eth?.signal || 'N/A'}`,
    `🖥️ RAM: ${h.ramUsedPct || 'N/A'}% | Disk C: ${h.diskUsedPct || 'N/A'}%`,
    `✅ Cycle complete`
  ].join('\n');
}

module.exports = { UnifiedMasterOrchestrator };

if (require.main === module) {
  const mode = process.argv[2] || 'once';
  const orchestrator = new UnifiedMasterOrchestrator();
  if (mode === 'loop') {
    orchestrator.startLoop(600000, process.argv[3]);
  } else {
    orchestrator.runOnce().then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.success ? 0 : 1);
    });
  }
}
