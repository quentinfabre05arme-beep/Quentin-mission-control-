/**
 * UNIFIED MASTER ORCHESTRATOR
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

class UnifiedMasterOrchestrator {
  constructor() {
    this.state = loadState();
    this.workflows = new ClawWorkflows();
  }
  
  async runResearch(query = 'BTC crypto market news today') {
    log(`Step: Market research — ${query}`);
    try {
      const research = await this.workflows.orch.runCommand('research_agent research', [query, 5]);
      if (!research.success) {
        log(`Research failed: ${research.error}`, 'warn');
        return { success: false, error: research.error };
      }
      return research;
    } catch(e) {
      log(`Research exception: ${e.message}`, 'error');
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Generate a concise status report suitable for Telegram.
   */
  async generateReport() {
    const { CapabilityInvoker } = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'capability_invoker'));
    const invoker = new CapabilityInvoker();

    let health = { success: false, result: {} };
    let fund = { total_value: 0, return_pct: 0, mode: 'unknown' };
    let audit = { real: 0, stubs: 0, syntax_errors: 0 };
    let market = {};

    try {
      health = await invoker.invoke('system_health_monitor', 'getHealth', []);
    } catch (e) { health = { success: false, error: e.message }; }

    try {
      fund = AlphaFund.COMMANDS.status(['--json']);
    } catch (e) { fund = { total_value: 0, return_pct: 0, mode: 'error', error: e.message }; }

    try {
      const auditRaw = await invoker.invoke('self_audit', 'run', []);
      if (auditRaw.success && auditRaw.result && auditRaw.result.summary) {
        audit = auditRaw.result.summary;
      }
    } catch (e) { audit.error = e.message; }

    try {
      const btc = await invoker.invoke('market_watcher', 'getTrend', ['BTC']);
      const eth = await invoker.invoke('market_watcher', 'getTrend', ['ETH']);
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
      // 1. System health check
      log('Step 1: System health');
      const healthCheck = await this.workflows.orch.healthCheck();
      actions.push({ step: 'health_check', healthy: healthCheck.healthy, issues: healthCheck.issues });

      // 2. Self-healing if issues
      if (!healthCheck.healthy) {
        log('Health issues detected, running self-healing', 'warn');
        const cleanup = await this.workflows.orch.runCommand('predictive_maintenance run');
        actions.push({ step: 'predictive_maintenance', result: cleanup.success });
        // Also run RAM cleanup directly
        try {
          const rc = require(path.join(WORKSPACE, 'alpha_fund_v3', 'scripts', 'ram_cleanup'));
          const before = rc.cleanup();
          actions.push({ step: 'ram_cleanup', saved_mb: before.saved_mb, after_pct: before.after.pct });
        } catch(e) {
          actions.push({ step: 'ram_cleanup', error: e.message });
        }
      }

      // 3. Alpha Fund status
      log('Step 2: Alpha Fund status');
      const fundStatus = AlphaFund.COMMANDS.status(['--json']);
      actions.push({ step: 'fund_status', total_value: fundStatus.total_value, return_pct: fundStatus.total_return_pct });

      // 4. Run research
      const research = await this.runResearch();
      actions.push({ step: 'research', success: research.success, result_size: research.result ? JSON.stringify(research.result).length : 0 });

      // 5. Generate market watcher trend
      log('Step 3: Market watcher');
      const btcTrend = await this.workflows.orch.runCommand('market_watcher getTrend', ['BTC']);
      const ethTrend = await this.workflows.orch.runCommand('market_watcher getTrend', ['ETH']);
      actions.push({ step: 'market_watch', btc: btcTrend.result, eth: ethTrend.result });

      // 6. Self-audit
      log('Step 4: Self audit');
      const audit = await this.workflows.orch.runCommand('self_audit run');
      const auditSummary = audit.success && audit.result && audit.result.summary ? audit.result.summary : { real: 0, stubs: 0, syntax_errors: 0 };
      actions.push({ step: 'self_audit', real: auditSummary.real, stubs: auditSummary.stubs, syntax_errors: auditSummary.syntax_errors });

      // 7. Git backup
      log('Step 5: Git backup');
      const gitStatus = await this.workflows.orch.runCommand('git_agent status');
      const hasChanges = gitStatus.result && (gitStatus.result.has_changes || gitStatus.result.ahead || gitStatus.result.modified > 0);
      if (hasChanges) {
        const commit = await this.workflows.orch.runCommand('git_agent autoCommitPush', ['Auto: Unified master cycle']);
        actions.push({ step: 'git_backup', success: commit.success });
      } else {
        actions.push({ step: 'git_backup', note: 'no changes' });
      }

      // 8. Generate and optionally send report
      if (reportTarget) {
        log('Step 6: Telegram report');
        report = await this.generateReport();
        try {
          const { message } = require('./telegram_helper');
          await message({ action: 'send', target: reportTarget, channel: 'telegram', message: formatReport(report) });
          actions.push({ step: 'telegram_report', sent: true });
        } catch (e) {
          log(`Telegram report failed: ${e.message}`, 'warn');
          actions.push({ step: 'telegram_report', sent: false, error: e.message });
        }
      }

      // Update state
      this.state.cycles++;
      this.state.last_cycle = new Date().toISOString();
      this.state.actions = actions;
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
    // Keep process alive indefinitely
    timer.unref = () => {};
  }
}

function formatReport(r) {
  const h = r.health || {};
  const f = r.fund || {};
  const a = r.audit || {};
  const m = r.market || {};
  const btc = m.btc || {};
  const eth = m.eth || {};
  return `\u003e **CLAW MASTER CYCLE #${r.cycle}**\n` +
    `\u23f0 ${new Date(r.timestamp).toLocaleString('fr-FR')}\n\n` +
    `\ud83d\udcbe **System**\nRAM: ${h.ram_pct || '?'}% | Disk: ${h.disk_pct || '?'}% | Uptime: ${h.uptime || '?'}\n\n` +
    `\ud83d\udcc8 **Alpha Fund**\nValue: $${f.total_value ? f.total_value.toFixed(2) : '?'} (${f.return_pct ? f.return_pct.toFixed(2) : '?'}%) | Mode: ${f.mode || '?'}\n\n` +
    `\ud83d\udd0d **Audit**\n${a.real || 0} real | ${a.stubs || 0} stubs | ${a.syntax_errors || 0} syntax errors\n\n` +
    `\ud83d\udcb0 **Market**\nBTC: ${btc.trend || '?'} @ $${btc.price || '?'}\nETH: ${eth.trend || '?'} @ $${eth.price || '?'}\n`;
}

module.exports = { UnifiedMasterOrchestrator };

if (require.main === module) {
  const master = new UnifiedMasterOrchestrator();
  const mode = process.argv[2] || 'once';
  if (mode === 'loop') {
    const interval = parseInt(process.argv[3], 10) || 600000;
    const target = process.argv[4] || null;
    master.startLoop(interval, target);
  } else {
    const target = process.argv[3] || null;
    master.runOnce(target).then(r => {
      console.log('\n=== RESULT ===');
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e);
      process.exit(1);
    });
  }
}
