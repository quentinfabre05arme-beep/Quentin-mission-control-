// Central Mission Orchestrator
// Replaces 6 individual orchestrators

const fs = require('fs');
const path = require('path');

const MISSIONS_DIR = path.join(__dirname, '..', '..', 'missions');
const STATE_FILE = path.join(__dirname, '..', '..', 'memory', 'orchestrator_state.json');

class CentralOrchestrator {
  constructor() {
    this.state = this.loadState();
    this.missions = this.discoverMissions();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return {
        lastRun: null,
        cycles: 0,
        missionStatus: {},
        activeMissions: []
      };
    }
  }

  discoverMissions() {
    const missions = [];
    const dirs = fs.readdirSync(MISSIONS_DIR)
      .filter(f => fs.statSync(path.join(MISSIONS_DIR, f)).isDirectory());

    for (const dir of dirs) {
      const missionDir = path.join(MISSIONS_DIR, dir);
      const files = fs.readdirSync(missionDir);
      
      // Check if mission has a defined role
      const roleFile = path.join(missionDir, 'ROLE.md');
      let role = 'undefined';
      if (fs.existsSync(roleFile)) {
        role = fs.readFileSync(roleFile, 'utf8').split('\n')[0].replace('# ', '');
      }

      missions.push({
        id: dir,
        path: missionDir,
        role: role,
        files: files.length,
        hasState: files.includes('team_state.json'),
        hasOrchestrator: files.some(f => f.includes('orchestrator')),
        hasHealth: files.some(f => f.includes('health') || f.includes('monitor')),
        hasResearch: files.some(f => f.includes('research')),
        status: this.state.missionStatus[dir] || 'unknown'
      });
    }

    return missions;
  }

  // Assign unique roles to each mission
  assignRoles() {
    const roleMap = {
      'agents': { role: 'meta-learning', focus: 'Mission auditing, self-improvement', stop: ['orchestration', 'health', 'research'] },
      'autonomy_core': { role: 'self-healing', focus: 'Error recovery, resilience', stop: ['orchestration', 'health'] },
      'mission_control_center': { role: 'dashboard', focus: 'Command center, visualization', stop: ['health', 'content'] },
      'system_monitor': { role: 'health-monitoring', focus: 'System health ONLY', stop: ['orchestration', 'research'] },
      'smart_brain': { role: 'ai-routing', focus: 'Model selection, optimization', stop: ['health', 'research'] },
      'self_healing': { role: 'error-recovery', focus: 'Automatic fixes', stop: ['orchestration'] },
      'oomol_hub': { role: 'oomol-integration', focus: 'OOMOL workflows', stop: ['orchestration'] },
      'alpha_signals': { role: 'trading-signals', focus: 'Alpha generation', stop: [] },
      'file_librarian': { role: 'file-management', focus: 'Organization, indexing', stop: [] },
      'meta_architect': { role: 'architecture', focus: 'System design', stop: [] },
      'aggressive_scaling': { role: 'scaling', focus: 'Growth optimization', stop: [] },
      'cost_monitor': { role: 'cost-tracking', focus: 'Expense management', stop: [] },
      'protocol_updates': { role: 'updates', focus: 'System updates', stop: [] },
      'self_improvement': { role: 'self-improvement', focus: 'Capability enhancement', stop: [] },
      'ultimate_intelligence': { role: 'intelligence', focus: 'Advanced reasoning', stop: [] },
      'oomol_workflows': { role: 'workflows', focus: 'Automation flows', stop: ['research'] }
    };

    for (const mission of this.missions) {
      const config = roleMap[mission.id] || { role: 'undefined', focus: 'Needs definition', stop: [] };
      mission.assignedRole = config.role;
      mission.focus = config.focus;
      mission.stopDoing = config.stop;
    }

    return this.missions;
  }

  // Check for overlaps
  detectOverlaps() {
    const overlaps = [];

    // Check orchestrators
    const orchestrators = this.missions.filter(m => m.hasOrchestrator);
    if (orchestrators.length > 1) {
      overlaps.push({
        type: 'orchestrator',
        missions: orchestrators.map(m => m.id),
        severity: 'critical',
        action: 'Use central orchestrator, remove from: ' + orchestrators.slice(1).map(m => m.id).join(', ')
      });
    }

    // Check health
    const health = this.missions.filter(m => m.hasHealth);
    if (health.length > 1) {
      overlaps.push({
        type: 'health',
        missions: health.map(m => m.id),
        severity: 'warning',
        action: 'Centralize to system_monitor, remove from: ' + health.filter(m => m.id !== 'system_monitor').map(m => m.id).join(', ')
      });
    }

    // Check research
    const research = this.missions.filter(m => m.hasResearch);
    if (research.length > 1) {
      overlaps.push({
        type: 'research',
        missions: research.map(m => m.id),
        severity: 'warning',
        action: 'Use crypto-research-assistant skill, remove from: ' + research.slice(1).map(m => m.id).join(', ')
      });
    }

    return overlaps;
  }

  // Generate consolidation plan
  generatePlan() {
    const overlaps = this.detectOverlaps();
    const roles = this.assignRoles();

    return {
      overlaps: overlaps,
      roles: roles.map(r => ({
        id: r.id,
        role: r.assignedRole,
        focus: r.focus,
        stopDoing: r.stopDoing,
        status: r.status
      })),
      actions: [
        'Remove orchestrator code from: ' + overlaps.find(o => o.type === 'orchestrator')?.missions.slice(1).join(', '),
        'Remove health checks from: ' + overlaps.find(o => o.type === 'health')?.missions.filter(m => m !== 'system_monitor').join(', '),
        'Remove research from: ' + overlaps.find(o => o.type === 'research')?.missions.slice(1).join(', ')
      ].filter(Boolean)
    };
  }

  // Save state
  saveState() {
    this.state.lastRun = new Date().toISOString();
    this.state.cycles++;
    
    for (const mission of this.missions) {
      this.state.missionStatus[mission.id] = mission.status;
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  // Get status
  getStatus() {
    return {
      totalMissions: this.missions.length,
      activeMissions: this.missions.filter(m => m.status === 'active').length,
      overlaps: this.detectOverlaps().length,
      rolesDefined: this.missions.filter(m => m.assignedRole).length,
      lastRun: this.state.lastRun,
      cycles: this.state.cycles
    };
  }
}

module.exports = CentralOrchestrator;

// CLI
if (require.main === module) {
  const orch = new CentralOrchestrator();
  
  const command = process.argv[2];
  
  if (command === 'plan') {
    const plan = orch.generatePlan();
    console.log('=== CONSOLIDATION PLAN ===\n');
    console.log('Overlaps found:', plan.overlaps.length);
    plan.overlaps.forEach(o => {
      console.log('\n[' + o.severity + '] ' + o.type + ' overlap:');
      console.log('  Missions:', o.missions.join(', '));
      console.log('  Action:', o.action);
    });
    
    console.log('\n=== ROLE ASSIGNMENTS ===');
    plan.roles.forEach(r => {
      console.log(r.id + ':');
      console.log('  Role:', r.role);
      console.log('  Focus:', r.focus);
      if (r.stopDoing.length > 0) {
        console.log('  Stop doing:', r.stopDoing.join(', '));
      }
    });
    
    console.log('\n=== ACTIONS NEEDED ===');
    plan.actions.forEach(a => console.log('  - ' + a));
    
  } else if (command === 'status') {
    console.log(JSON.stringify(orch.getStatus(), null, 2));
  } else {
    console.log('Usage: node central_orchestrator.js [plan|status]');
  }
}
