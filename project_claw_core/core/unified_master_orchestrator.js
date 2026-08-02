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
      const { CapabilityInvoker } = require(path.join(WORKSPACE, 'project_claw_core', 'core', 'capability_invoker'));
      const invoker = new CapabilityInvoker();
      const research = await invoker.invoke('research_agent', 'research', [query]);
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
  
  async runCycle() {
    log(`=== UNIFIED CYCLE #${this.state.cycles + 1} ===`);
    const start = Date.now();
    const actions = [];
    
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
      log('Step 4: Market watcher');
      const btcTrend = await this.workflows.orch.runCommand('market_watcher getTrend', ['BTC']);
      const ethTrend = await this.workflows.orch.runCommand('market_watcher getTrend', ['ETH']);
      actions.push({ step: 'market_watch', btc: btcTrend.result, eth: ethTrend.result });
      
      // 6. Self-audit
      log('Step 5: Self audit');
      const audit = await this.workflows.orch.runCommand('self_audit run');
      actions.push({ step: 'self_audit', real: audit.result.summary.real, stubs: audit.result.summary.stubs });
      
      // 7. Git backup
      log('Step 6: Git backup');
      const gitStatus = await this.workflows.orch.runCommand('git_agent status');
      const hasChanges = gitStatus.result && (gitStatus.result.has_changes || gitStatus.result.ahead || gitStatus.result.modified > 0);
      if (hasChanges) {
        const commit = await this.workflows.orch.runCommand('git_agent autoCommitPush', ['Auto: Unified master cycle']);
        actions.push({ step: 'git_backup', success: commit.success });
      } else {
        actions.push({ step: 'git_backup', note: 'no changes' });
      }
      
      // Update state
      this.state.cycles++;
      this.state.last_cycle = new Date().toISOString();
      this.state.actions = actions;
      this.state.duration_ms = Date.now() - start;
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
  
  startLoop(intervalMs = 600000) {
    log(`Starting unified master loop every ${intervalMs / 60000} minutes`);
    this.runCycle();
    setInterval(() => this.runCycle(), intervalMs);
  }
}

module.exports = { UnifiedMasterOrchestrator };

if (require.main === module) {
  const master = new UnifiedMasterOrchestrator();
  master.runOnce().then(r => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
