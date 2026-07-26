// Agent Monitor & Alert System
// Tracks agent health and alerts on issues

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const ALERT_FILE = path.join(__dirname, 'alerts.jsonl');
const PERFORMANCE_FILE = path.join(__dirname, 'performance_history.json');

class AgentMonitor {
  constructor() {
    this.state = this.loadState();
    this.alerts = [];
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return { agents: [] };
    }
  }

  // Check all agents
  checkAll() {
    const results = [];
    
    for (const agent of this.state.agents) {
      results.push(this.checkAgent(agent));
    }
    
    return results;
  }

  checkAgent(agent) {
    const issues = [];
    const now = Date.now();
    
    // Check if agent is active
    if (agent.status !== 'active') {
      issues.push({
        severity: 'warning',
        message: `Agent ${agent.id} is ${agent.status}, not active`
      });
    }
    
    // Check last run time
    if (agent.lastRun) {
      const lastRun = new Date(agent.lastRun).getTime();
      const hoursSince = (now - lastRun) / (1000 * 60 * 60);
      
      if (hoursSince > 24) {
        issues.push({
          severity: 'critical',
          message: `Agent ${agent.id} hasn't run in ${hoursSince.toFixed(1)} hours`
        });
      } else if (hoursSince > 12) {
        issues.push({
          severity: 'warning',
          message: `Agent ${agent.id} hasn't run in ${hoursSince.toFixed(1)} hours`
        });
      }
    } else {
      issues.push({
        severity: 'warning',
        message: `Agent ${agent.id} has never run`
      });
    }
    
    // Check error count
    if (agent.errors > 5) {
      issues.push({
        severity: 'critical',
        message: `Agent ${agent.id} has ${agent.errors} errors`
      });
    } else if (agent.errors > 2) {
      issues.push({
        severity: 'warning',
        message: `Agent ${agent.id} has ${agent.errors} errors`
      });
    }
    
    return {
      agent: agent.id,
      status: agent.status,
      healthy: issues.length === 0,
      issues
    };
  }

  // Generate alert
  alert(issue) {
    const alert = {
      timestamp: new Date().toISOString(),
      severity: issue.severity,
      message: issue.message,
      acknowledged: false
    };
    
    this.alerts.push(alert);
    fs.appendFileSync(ALERT_FILE, JSON.stringify(alert) + '\n');
    
    return alert;
  }

  // Get health summary
  getHealthSummary() {
    const checks = this.checkAll();
    
    const healthy = checks.filter(c => c.healthy).length;
    const unhealthy = checks.filter(c => !c.healthy).length;
    const critical = checks.flatMap(c => c.issues).filter(i => i.severity === 'critical').length;
    const warnings = checks.flatMap(c => c.issues).filter(i => i.severity === 'warning').length;
    
    return {
      total: checks.length,
      healthy,
      unhealthy,
      critical,
      warnings,
      agents: checks
    };
  }

  // Get performance metrics
  getPerformanceMetrics() {
    try {
      const perf = JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf8'));
      const recent = perf.cycles.slice(-10);
      
      return {
        totalCycles: perf.cycles.length,
        recentCycles: recent.length,
        avgDuration: recent.length > 0 
          ? (recent.reduce((a, b) => a + b.duration, 0) / recent.length).toFixed(0)
          : 0,
        successRate: recent.length > 0
          ? (recent.filter(c => c.success).length / recent.length * 100).toFixed(1)
          : 0,
        improvements: perf.improvements.length
      };
    } catch(e) {
      return { error: e.message };
    }
  }

  // Run full monitoring check
  runCheck() {
    const health = this.getHealthSummary();
    const performance = this.getPerformanceMetrics();
    
    // Alert on critical issues
    for (const agent of health.agents) {
      for (const issue of agent.issues) {
        if (issue.severity === 'critical') {
          this.alert(issue);
        }
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      health,
      performance,
      alerts: this.alerts.length
    };
  }
}

module.exports = AgentMonitor;

// CLI
if (require.main === module) {
  const monitor = new AgentMonitor();
  
  const command = process.argv[2];
  
  if (command === 'check') {
    const result = monitor.runCheck();
    console.log('=== AGENT HEALTH CHECK ===');
    console.log('Timestamp:', result.timestamp);
    console.log('');
    console.log('Health:', result.health.healthy + '/' + result.health.total + ' healthy');
    if (result.health.critical > 0) {
      console.log('Critical issues:', result.health.critical);
    }
    if (result.health.warnings > 0) {
      console.log('Warnings:', result.health.warnings);
    }
    console.log('');
    console.log('Performance:');
    console.log('  Total cycles:', result.performance.totalCycles);
    console.log('  Success rate:', result.performance.successRate + '%');
    console.log('  Avg duration:', result.performance.avgDuration + 'ms');
    console.log('  Improvements:', result.performance.improvements);
    
    if (result.alerts > 0) {
      console.log('\n⚠️ ' + result.alerts + ' alerts generated');
    }
  } else {
    console.log('Usage: node agent_monitor.js [check]');
  }
}
