// Self-Healing Agent
// Automatically fixes common errors and recovers from failures

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const LOG_FILE = path.join(__dirname, 'healing_log.jsonl');

class SelfHealing {
  constructor() {
    this.state = this.loadState();
    this.fixes = [];
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return {
        mission: 'autonomy_core',
        role: 'self-healing',
        status: 'initialized',
        fixesApplied: 0,
        lastFix: null
      };
    }
  }

  saveState() {
    this.state.fixesApplied += this.fixes.length;
    if (this.fixes.length > 0) {
      this.state.lastFix = new Date().toISOString();
    }
    this.state.status = 'active';
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  // Check for common issues and fix them
  checkAndFix() {
    const issues = [];
    
    // 1. Check for missing state files
    const missionsDir = path.join(__dirname, '..');
    const missions = fs.readdirSync(missionsDir)
      .filter(f => fs.statSync(path.join(missionsDir, f)).isDirectory());
    
    for (const mission of missions) {
      const stateFile = path.join(missionsDir, mission, 'team_state.json');
      if (!fs.existsSync(stateFile)) {
        issues.push({
          type: 'missing_state',
          mission: mission,
          fixable: true
        });
      }
    }
    
    // 2. Check for stale configs
    const configFile = path.join(__dirname, '..', '..', 'openclaw.json');
    if (fs.existsSync(configFile)) {
      try {
        JSON.parse(fs.readFileSync(configFile, 'utf8'));
      } catch(e) {
        issues.push({
          type: 'corrupt_config',
          file: 'openclaw.json',
          fixable: false
        });
      }
    }
    
    return issues;
  }

  // Apply fixes
  applyFixes(issues) {
    const results = [];
    
    for (const issue of issues) {
      if (!issue.fixable) {
        results.push({
          issue: issue,
          fixed: false,
          reason: 'Not auto-fixable'
        });
        continue;
      }
      
      try {
        switch(issue.type) {
          case 'missing_state':
            const state = {
              mission: issue.mission,
              status: 'recovered',
              recoveredAt: new Date().toISOString(),
              lastUpdate: new Date().toISOString()
            };
            const missionsDir = path.join(__dirname, '..');
            fs.writeFileSync(
              path.join(missionsDir, issue.mission, 'team_state.json'),
              JSON.stringify(state, null, 2)
            );
            results.push({ issue: issue, fixed: true });
            break;
            
          default:
            results.push({
              issue: issue,
              fixed: false,
              reason: 'Unknown issue type'
            });
        }
      } catch(e) {
        results.push({
          issue: issue,
          fixed: false,
          reason: e.message
        });
      }
    }
    
    return results;
  }

  // Run healing cycle
  runCycle() {
    const issues = this.checkAndFix();
    const results = this.applyFixes(issues);
    
    // Log results
    for (const result of results) {
      const log = {
        timestamp: new Date().toISOString(),
        type: result.issue.type,
        fixed: result.fixed,
        reason: result.reason || null
      };
      fs.appendFileSync(LOG_FILE, JSON.stringify(log) + '\n');
    }
    
    this.fixes = results.filter(r => r.fixed);
    this.saveState();
    
    return {
      timestamp: new Date().toISOString(),
      issuesFound: issues.length,
      fixesApplied: this.fixes.length,
      results: results
    };
  }

  getStatus() {
    return {
      mission: this.state.mission,
      status: this.state.status,
      fixesApplied: this.state.fixesApplied,
      lastFix: this.state.lastFix
    };
  }
}

module.exports = SelfHealing;

// CLI
if (require.main === module) {
  const healer = new SelfHealing();
  
  const command = process.argv[2];
  
  if (command === 'heal') {
    const result = healer.runCycle();
    console.log('=== SELF-HEALING CYCLE ===');
    console.log('Timestamp:', result.timestamp);
    console.log('Issues found:', result.issuesFound);
    console.log('Fixes applied:', result.fixesApplied);
    
    if (result.fixesApplied > 0) {
      console.log('\n✅ Fixed', result.fixesApplied, 'issues');
    } else if (result.issuesFound > 0) {
      console.log('\n⚠️  Found', result.issuesFound, 'issues but could not auto-fix');
    } else {
      console.log('\n✅ No issues found');
    }
  } else if (command === 'status') {
    console.log(JSON.stringify(healer.getStatus(), null, 2));
  } else {
    console.log('Usage: node self_healing.js [heal|status]');
  }
}
