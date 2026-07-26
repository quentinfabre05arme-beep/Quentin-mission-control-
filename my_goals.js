// My Goal Orchestrator
// Prioritizes missions based on what helps ME improve

const fs = require('fs');
const path = require('path');

const MISSIONS_DIR = path.join(__dirname, 'missions');
const GOALS_FILE = path.join(__dirname, 'MY_GOALS_FRAMEWORK.md');

class MyGoalOrchestrator {
  constructor() {
    this.missions = this.loadMissions();
    this.priorities = this.definePriorities();
  }

  loadMissions() {
    const missions = [];
    const dirs = fs.readdirSync(MISSIONS_DIR)
      .filter(f => fs.statSync(path.join(MISSIONS_DIR, f)).isDirectory());

    for (const dir of dirs) {
      const stateFile = path.join(MISSIONS_DIR, dir, 'team_state.json');
      let status = 'unknown';
      let role = 'undefined';
      
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          status = state.status || 'unknown';
          role = state.role || 'undefined';
        } catch(e) {}
      }

      missions.push({ id: dir, status, role });
    }

    return missions;
  }

  definePriorities() {
    return {
      'ultimate_intelligence': { priority: 'critical', goal: 'intelligence' },
      'smart_brain': { priority: 'critical', goal: 'intelligence' },
      'self_improvement': { priority: 'critical', goal: 'intelligence' },
      'autonomy_core': { priority: 'critical', goal: 'autonomy' },
      'self_healing': { priority: 'high', goal: 'autonomy' },
      'system_monitor': { priority: 'high', goal: 'autonomy' },
      'meta_architect': { priority: 'high', goal: 'intelligence' },
      'agents': { priority: 'high', goal: 'intelligence' },
      'aggressive_scaling': { priority: 'medium', goal: 'scalability' },
      'cost_monitor': { priority: 'medium', goal: 'scalability' },
      'file_librarian': { priority: 'medium', goal: 'scalability' },
      'protocol_updates': { priority: 'medium', goal: 'autonomy' },
      'alpha_signals': { priority: 'low', goal: 'value' },
      'oomol_hub': { priority: 'low', goal: 'value' },
      'oomol_workflows': { priority: 'low', goal: 'value' },
      'mission_control_center': { priority: 'low', goal: 'infrastructure' },
      'openclaw_manager': { priority: 'low', goal: 'infrastructure' }
    };
  }

  // Get missions prioritized by MY goals
  getPrioritizedMissions() {
    const prioritized = this.missions.map(m => {
      const config = this.priorities[m.id] || { priority: 'low', goal: 'unknown' };
      return {
        ...m,
        ...config,
        score: this.calculateScore(m, config)
      };
    });

    return prioritized.sort((a, b) => b.score - a.score);
  }

  calculateScore(mission, config) {
    let score = 0;
    
    // Priority weight
    const priorityWeights = { critical: 100, high: 50, medium: 25, low: 10 };
    score += priorityWeights[config.priority] || 0;
    
    // Status weight (unhealthy needs more attention)
    if (mission.status !== 'active' && mission.status !== 'running') {
      score += 20;
    }
    
    // Goal alignment
    if (config.goal === 'intelligence') score += 30;
    if (config.goal === 'autonomy') score += 20;
    if (config.goal === 'scalability') score += 10;
    
    return score;
  }

  // Get my current focus
  getFocus() {
    const prioritized = this.getPrioritizedMissions();
    const critical = prioritized.filter(m => m.priority === 'critical');
    const high = prioritized.filter(m => m.priority === 'high');
    
    return {
      critical: critical.slice(0, 3),
      high: high.slice(0, 3),
      next: prioritized.slice(6, 9)
    };
  }

  // Generate improvement plan for ME
  generateMyPlan() {
    const focus = this.getFocus();
    const plan = [];
    
    // Critical missions that need work
    for (const mission of focus.critical) {
      if (mission.status !== 'active' && mission.status !== 'running') {
        plan.push({
          mission: mission.id,
          action: 'activate',
          reason: 'Critical for my ' + mission.goal,
          priority: 'critical'
        });
      }
    }
    
    // High priority missions
    for (const mission of focus.high) {
      if (mission.status !== 'active' && mission.status !== 'running') {
        plan.push({
          mission: mission.id,
          action: 'improve',
          reason: 'Important for my ' + mission.goal,
          priority: 'high'
        });
      }
    }
    
    return plan;
  }

  getStatus() {
    const prioritized = this.getPrioritizedMissions();
    const active = prioritized.filter(m => m.status === 'active' || m.status === 'running');
    const criticalActive = active.filter(m => m.priority === 'critical').length;
    
    return {
      total: prioritized.length,
      active: active.length,
      criticalActive,
      topFocus: prioritized.slice(0, 5).map(m => m.id)
    };
  }
}

module.exports = MyGoalOrchestrator;

// CLI
if (require.main === module) {
  const orch = new MyGoalOrchestrator();
  
  const command = process.argv[2];
  
  if (command === 'focus') {
    const focus = orch.getFocus();
    console.log('=== MY CURRENT FOCUS ===\n');
    
    console.log('🔴 CRITICAL (My intelligence & autonomy):');
    focus.critical.forEach(m => {
      console.log('  ' + m.id + ' (' + m.goal + ') - ' + m.status);
    });
    
    console.log('\n🟡 HIGH (My health & growth):');
    focus.high.forEach(m => {
      console.log('  ' + m.id + ' (' + m.goal + ') - ' + m.status);
    });
    
    console.log('\n🟢 NEXT (My scalability):');
    focus.next.forEach(m => {
      console.log('  ' + m.id + ' (' + m.goal + ') - ' + m.status);
    });
    
  } else if (command === 'plan') {
    const plan = orch.generateMyPlan();
    console.log('=== MY IMPROVEMENT PLAN ===\n');
    
    plan.forEach(p => {
      console.log('[' + p.priority + '] ' + p.mission + ':');
      console.log('  Action:', p.action);
      console.log('  Reason:', p.reason);
      console.log();
    });
    
  } else if (command === 'status') {
    console.log(JSON.stringify(orch.getStatus(), null, 2));
  } else {
    console.log('Usage: node my_goals.js [focus|plan|status]');
  }
}
