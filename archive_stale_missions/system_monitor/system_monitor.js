// Working System Monitor
// Monitors system health and alerts on issues

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const ALERTS_FILE = path.join(__dirname, 'alerts.jsonl');

class SystemMonitor {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return {
        mission: 'system_monitor',
        role: 'health-monitoring',
        status: 'initialized',
        lastCheck: null,
        checksRun: 0
      };
    }
  }

  saveState() {
    this.state.lastCheck = new Date().toISOString();
    this.state.checksRun++;
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  // Check workspace health
  checkWorkspace() {
    const issues = [];
    
    try {
      const files = fs.readdirSync('.');
      if (files.length === 0) {
        issues.push({ type: 'workspace', severity: 'critical', message: 'Workspace is empty' });
      }
    } catch(e) {
      issues.push({ type: 'workspace', severity: 'critical', message: 'Cannot read workspace: ' + e.message });
    }

    return { ok: issues.length === 0, issues };
  }

  // Check missions health
  checkMissions() {
    const missionsDir = path.join(__dirname, '..');
    const missions = fs.readdirSync(missionsDir)
      .filter(f => fs.statSync(path.join(missionsDir, f)).isDirectory());

    const issues = [];
    let healthy = 0;
    let total = 0;

    for (const mission of missions) {
      const stateFile = path.join(missionsDir, mission, 'team_state.json');
      total++;
      
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          if (state.status === 'active' || state.status === 'running' || state.status === 'initialized') {
            healthy++;
          } else {
            issues.push({
              type: 'mission',
              severity: 'warning',
              message: 'Mission ' + mission + ' status: ' + state.status
            });
          }
        } catch(e) {
          issues.push({
            type: 'mission',
            severity: 'critical',
            message: 'Mission ' + mission + ' has corrupted state'
          });
        }
      } else {
        issues.push({
          type: 'mission',
          severity: 'critical',
          message: 'Mission ' + mission + ' has no state file'
        });
      }
    }

    return { ok: issues.length === 0, healthy, total, issues };
  }

  // Check git status
  checkGit() {
    const issues = [];
    
    if (!fs.existsSync('.git')) {
      issues.push({ type: 'git', severity: 'warning', message: 'No git repository' });
    }

    return { ok: issues.length === 0, issues };
  }

  // Run all checks
  runChecks() {
    const workspace = this.checkWorkspace();
    const missions = this.checkMissions();
    const git = this.checkGit();

    const allIssues = [
      ...workspace.issues,
      ...missions.issues,
      ...git.issues
    ];

    // Log alerts
    for (const issue of allIssues) {
      const alert = {
        timestamp: new Date().toISOString(),
        ...issue,
        acknowledged: false
      };
      fs.appendFileSync(ALERTS_FILE, JSON.stringify(alert) + '\n');
    }

    this.saveState();

    return {
      timestamp: new Date().toISOString(),
      workspace: workspace.ok ? 'OK' : 'ISSUES',
      missions: missions.healthy + '/' + missions.total + ' healthy',
      git: git.ok ? 'OK' : 'ISSUES',
      totalIssues: allIssues.length,
      issues: allIssues
    };
  }

  getStatus() {
    return {
      mission: this.state.mission,
      status: this.state.status,
      checksRun: this.state.checksRun,
      lastCheck: this.state.lastCheck
    };
  }
}

module.exports = SystemMonitor;

// CLI
if (require.main === module) {
  const monitor = new SystemMonitor();
  
  const command = process.argv[2];
  
  if (command === 'check') {
    const result = monitor.runChecks();
    console.log('=== SYSTEM HEALTH CHECK ===');
    console.log('Timestamp:', result.timestamp);
    console.log('Workspace:', result.workspace);
    console.log('Missions:', result.missions);
    console.log('Git:', result.git);
    
    if (result.totalIssues > 0) {
      console.log('\nIssues:', result.totalIssues);
      result.issues.forEach(i => {
        console.log('  [' + i.severity + '] ' + i.type + ': ' + i.message);
      });
    } else {
      console.log('\n✅ All checks passed!');
    }
  } else if (command === 'status') {
    console.log(JSON.stringify(monitor.getStatus(), null, 2));
  } else {
    console.log('Usage: node system_monitor.js [check|status]');
  }
}
