/**
 * ALPHA FUND v3.0 — Claw Core Workflows
 * Pre-built capability chains for the investment brain.
 */

const path = require('path');

let UnifiedOrchestrator;
try {
  UnifiedOrchestrator = require('../project_claw_core/core/unified_orchestrator').UnifiedOrchestrator;
} catch(e) {
  UnifiedOrchestrator = require('../../project_claw_core/core/unified_orchestrator').UnifiedOrchestrator;
}

class ClawWorkflows {
  constructor() {
    this.orch = new UnifiedOrchestrator();
  }
  
  async systemSnapshot() {
    const health = await this.orch.runCommand('system_health_monitor getHealth');
    const audit = await this.orch.runCommand('self_audit run');
    return {
      success: true,
      health: health.result,
      audit: audit.result.summary
    };
  }
  
  async researchWeb(query) {
    return await this.orch.runCommand('research_agent search', [query]);
  }
  
  async fileAndCommit(files, message) {
    const git = await this.orch.runCommand('git_agent addCommitPush', [message]);
    return { success: true, git };
  }
  
  async notifyTelegram(message) {
    // Uses Telegram via OpenClaw message tool not available here; fallback to status reporter file
    return await this.orch.runCommand('status_reporter generate');
  }
  
  async healthCheck() {
    const check = await this.orch.healthCheck();
    if (!check.healthy) {
      await this.orch.runCommand('predictive_maintenance predict');
    }
    return check;
  }
}

module.exports = { ClawWorkflows };

if (require.main === module) {
  (async () => {
    const wf = new ClawWorkflows();
    console.log(JSON.stringify(await wf.systemSnapshot(), null, 2));
  })();
}
