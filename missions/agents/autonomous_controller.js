// Autonomous Mission Controller
// Self-scheduling, self-improving, self-monitoring

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const LOG_FILE = path.join(__dirname, 'team_log.txt');
const PERFORMANCE_FILE = path.join(__dirname, 'performance_history.json');

class AutonomousController {
  constructor() {
    this.state = this.loadState();
    this.performance = this.loadPerformance();
    this.cycleStart = Date.now();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return { agents: [], status: 'unknown' };
    }
  }

  loadPerformance() {
    try {
      return JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf8'));
    } catch(e) {
      return { cycles: [], improvements: [] };
    }
  }

  // Self-scheduling: Check which agents need to run
  checkSchedule() {
    const now = Date.now();
    const due = [];
    
    for (const agent of this.state.agents) {
      const lastRun = agent.lastRun ? new Date(agent.lastRun).getTime() : 0;
      const interval = this.getInterval(agent.id);
      
      if (now - lastRun >= interval) {
        due.push(agent);
      }
    }
    
    return due;
  }

  getInterval(agentId) {
    const intervals = {
      system: 2 * 60 * 60 * 1000,      // 2 hours
      research: 4 * 60 * 60 * 1000,    // 4 hours
      content: 6 * 60 * 60 * 1000,     // 6 hours
      revenue: 8 * 60 * 60 * 1000      // 8 hours
    };
    return intervals[agentId] || 4 * 60 * 60 * 1000;
  }

  // Self-improvement: Analyze performance and adjust
  analyzePerformance() {
    const recent = this.performance.cycles.slice(-10);
    if (recent.length < 5) return null;

    const avgDuration = recent.reduce((a, b) => a + b.duration, 0) / recent.length;
    const avgSuccess = recent.reduce((a, b) => a + (b.success ? 1 : 0), 0) / recent.length;

    const improvements = [];

    // If success rate is low, reduce frequency
    if (avgSuccess < 0.8) {
      improvements.push({
        type: 'reduce_frequency',
        reason: 'Success rate below 80%',
        current: avgSuccess
      });
    }

    // If duration is long, optimize
    if (avgDuration > 60000) {
      improvements.push({
        type: 'optimize',
        reason: 'Duration exceeds 60s',
        current: avgDuration
      });
    }

    return improvements;
  }

  // Apply improvements
  applyImprovements(improvements) {
    for (const imp of improvements) {
      this.performance.improvements.push({
        timestamp: new Date().toISOString(),
        type: imp.type,
        reason: imp.reason,
        applied: true
      });

      // Adjust agent intervals
      if (imp.type === 'reduce_frequency') {
        for (const agent of this.state.agents) {
          // Increase interval by 50%
          const current = this.getInterval(agent.id);
          // Store adjustment in agent config
          agent.adjustedInterval = current * 1.5;
        }
      }
    }

    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(this.performance, null, 2));
  }

  // Self-monitoring: Health check
  healthCheck() {
    const issues = [];
    
    for (const agent of this.state.agents) {
      // Check if agent hasn't run in 2x its interval
      const lastRun = agent.lastRun ? new Date(agent.lastRun).getTime() : 0;
      const interval = this.getInterval(agent.id);
      
      if (Date.now() - lastRun > interval * 2) {
        issues.push({
          agent: agent.id,
          issue: 'stalled',
          lastRun: agent.lastRun,
          expected: interval / 1000 + 's ago'
        });
      }
      
      // Check if agent has high error rate
      if (agent.errors > 3) {
        issues.push({
          agent: agent.id,
          issue: 'high_errors',
          errors: agent.errors
        });
      }
    }

    return issues;
  }

  // Run a full autonomous cycle
  runCycle() {
    const cycleStart = Date.now();
    
    // 1. Check schedule
    const due = this.checkSchedule();
    
    // 2. Health check
    const issues = this.healthCheck();
    
    // 3. Self-improvement analysis
    const improvements = this.analyzePerformance();
    if (improvements && improvements.length > 0) {
      this.applyImprovements(improvements);
    }
    
    // 4. Record cycle
    const cycle = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - cycleStart,
      agentsDue: due.length,
      issuesFound: issues.length,
      improvementsApplied: improvements ? improvements.length : 0,
      success: issues.length === 0
    };
    
    this.performance.cycles.push(cycle);
    
    // Keep only last 100 cycles
    if (this.performance.cycles.length > 100) {
      this.performance.cycles = this.performance.cycles.slice(-100);
    }
    
    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(this.performance, null, 2));
    
    return {
      due,
      issues,
      improvements,
      cycle
    };
  }

  // Get status report
  getStatus() {
    return {
      status: this.state.status,
      agents: this.state.agents.map(a => ({
        id: a.id,
        status: a.status,
        lastRun: a.lastRun,
        nextRun: a.lastRun ? new Date(new Date(a.lastRun).getTime() + this.getInterval(a.id)).toISOString() : 'now',
        errors: a.errors || 0
      })),
      performance: {
        totalCycles: this.performance.cycles.length,
        avgSuccess: this.performance.cycles.length > 0 
          ? (this.performance.cycles.filter(c => c.success).length / this.performance.cycles.length * 100).toFixed(1) + '%'
          : 'N/A',
        improvements: this.performance.improvements.length
      }
    };
  }
}

module.exports = AutonomousController;

// CLI
if (require.main === module) {
  const controller = new AutonomousController();
  
  const command = process.argv[2];
  
  if (command === 'cycle') {
    const result = controller.runCycle();
    console.log('Cycle complete:');
    console.log('  Agents due:', result.due.length);
    console.log('  Issues:', result.issues.length);
    console.log('  Improvements:', result.improvements ? result.improvements.length : 0);
  } else if (command === 'status') {
    console.log(JSON.stringify(controller.getStatus(), null, 2));
  } else {
    console.log('Usage: node autonomous_controller.js [cycle|status]');
  }
}
