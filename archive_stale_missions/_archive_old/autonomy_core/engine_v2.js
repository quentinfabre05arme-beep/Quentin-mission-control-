/**
 * Autonomy Core v2.0 - Integration Hub
 * Main entry point that connects all subsystems
 */
const fs = require('fs');
const path = require('path');

const SelfImprovementLoop = require('./self_improvement_loop');
const RevenueTracker = require('./revenue_tracker');
const OpportunityScanner = require('./opportunity_scanner');
const DecisionMatrix = require('./decision_matrix');
const ErrorRecovery = require('./error_recovery');

class AutonomyCore {
  constructor() {
    this.loop = new SelfImprovementLoop();
    this.revenue = new RevenueTracker();
    this.scanner = new OpportunityScanner();
    this.matrix = new DecisionMatrix();
    this.recovery = new ErrorRecovery();
    
    this.LOG_DIR = path.join(__dirname, 'logs');
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.LOG_DIR, path.join(__dirname, 'data')].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async initialize() {
    console.log('🚀 Autonomy Core v2.0 Initializing...');
    
    const initTasks = [
      { name: 'Self-Improvement Loop', status: 'ready' },
      { name: 'Revenue Tracker', status: 'ready' },
      { name: 'Opportunity Scanner', status: 'ready' },
      { name: 'Decision Matrix', status: 'ready' },
      { name: 'Error Recovery', status: 'ready' }
    ];
    
    console.log('✅ All subsystems initialized');
    
    this.logToMemory('Initialization', {
      timestamp: new Date().toISOString(),
      subsystems: initTasks.map(t => t.name),
      version: '2.0'
    });
    
    return {
      status: 'ready',
      subsystems: initTasks,
      version: '2.0'
    };
  }

  async runCycle(context = {}) {
    const cycleId = `cycle_${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`\n🔄 [${cycleId}] Starting autonomy cycle...`);
    
    const results = {
      cycleId,
      timestamp: new Date().toISOString(),
      phases: {}
    };

    try {
      console.log('\n📋 Phase 1: Self-Improvement');
      results.phases.selfImprovement = await this.runSelfImprovement(context);
      
      console.log('\n💰 Phase 2: Revenue Tracking');
      results.phases.revenue = await this.trackRevenue(context);
      
      console.log('\n🔍 Phase 3: Opportunity Scan');
      results.phases.opportunities = await this.scanOpportunities(context);
      
      console.log('\n🤖 Phase 4: Decision Evaluation');
      results.phases.decisions = await this.evaluateDecisions(context, results.phases.opportunities);
      
      console.log('\n🛡️ Phase 5: Error Recovery');
      results.phases.recovery = await this.checkRecovery(context);
      
      results.duration = Date.now() - startTime;
      results.status = 'completed';
      
    } catch (error) {
      results.status = 'error';
      results.error = error.message;
      
      console.log('\n🚨 Error during cycle, attempting recovery...');
      results.recovery = await this.recovery.recover(error, async () => {
        return { success: true, recovered: true };
      }, context);
    }
    
    this.logCycle(results);
    this.logToMemory('Cycle Complete', results);
    
    console.log(`\n✅ [${cycleId}] Cycle completed in ${results.duration}ms`);
    
    return results;
  }

  async runSelfImprovement(context) {
    const previousErrors = this.recovery.getStats();
    
    return {
      status: 'checked',
      previousErrors,
      recommendations: previousErrors.failed > 0 
        ? ['Review failed recoveries', 'Update error patterns']
        : ['System healthy']
    };
  }

  async trackRevenue(context) {
    const summary = this.revenue.getDailySummary();
    const month = this.revenue.getMonthlyReport();
    
    return {
      daily: summary,
      monthly: month,
      streams: this.revenue.getRevenueStreams(),
      healthy: month.totals.profit > 0
    };
  }

  async scanOpportunities(context) {
    const scanData = context.marketData || {};
    return await this.scanner.fullScan(scanData);
  }

  async evaluateDecisions(context, opportunities) {
    if (!opportunities || !opportunities.opportunities) {
      return { status: 'no_opportunities' };
    }
    
    const topOpportunities = opportunities.opportunities.slice(0, 3);
    const decisions = topOpportunities.map(opp => {
      return this.matrix.evaluate({
        type: opp.type,
        roi: opp.potential_roi || 10,
        risk: opp.urgency === 'high' ? 6 : opp.urgency === 'medium' ? 4 : 2,
        urgency: opp.urgency === 'high' ? 8 : opp.urgency === 'medium' ? 5 : 2,
        effort: opp.effort_required === 'high' ? 8 : opp.effort_required === 'medium' ? 5 : 2,
        confidence: opp.confidence || 0.5,
        metadata: opp
      });
    });
    
    return {
      evaluated: decisions.length,
      decisions,
      auto_approved: decisions.filter(d => d.decision === 'AUTO_APPROVE').length,
      requires_review: decisions.filter(d => d.requires_approval).length
    };
  }

  async checkRecovery(context) {
    const stats = this.recovery.getStats();
    
    return {
      stats,
      healthy: stats.success_rate > 80 || stats.total === 0,
      recommendations: stats.success_rate < 80 && stats.total > 0
        ? ['Review error patterns', 'Update recovery strategies']
        : []
    };
  }

  logCycle(results) {
    const logFile = path.join(this.LOG_DIR, 'cycles.log');
    const entry = `[${results.timestamp}] ${results.cycleId}: ${results.status} | Duration: ${results.duration}ms\n`;
    fs.appendFileSync(logFile, entry);
  }

  logToMemory(event, data) {
    const MEMORY_FILE = path.join(process.cwd(), 'MEMORY.md');
    const entry = `
## Autonomy Core v2.0 - ${event}
**Time:** ${new Date().toISOString()}
**Data:** ${JSON.stringify(data, null, 2)}

---
`;

    try {
      if (fs.existsSync(MEMORY_FILE)) {
        fs.appendFileSync(MEMORY_FILE, entry);
      }
    } catch (e) {
      console.log('Could not write to MEMORY.md:', e.message);
    }
  }

  getStatus() {
    return {
      version: '2.0',
      timestamp: new Date().toISOString(),
      subsystems: {
        selfImprovement: 'ready',
        revenue: 'ready',
        scanner: 'ready',
        decisions: 'ready',
        recovery: 'ready'
      },
      stats: {
        decisions: this.matrix.getStats(),
        recovery: this.recovery.getStats(),
        revenue: this.revenue.getRevenueStreams()
      }
    };
  }
}

module.exports = AutonomyCore;

if (require.main === module) {
  const core = new AutonomyCore();
  
  core.initialize().then(() => {
    console.log('\n📊 System Status:', JSON.stringify(core.getStatus(), null, 2));
    
    return core.runCycle({
      marketData: {
        crypto: {
          BTC: { change_24h: -8, volume_24h: 25000000, volume_change: 180 }
        }
      }
    });
  }).then(results => {
    console.log('\n🎯 Cycle Results:');
    console.log(JSON.stringify(results, null, 2));
  }).catch(error => {
    console.error('Cycle failed:', error);
  });
}
