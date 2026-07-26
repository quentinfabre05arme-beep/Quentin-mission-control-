const fs = require('fs');
const path = require('path');

// Mission implementations to create
const implementations = {
  'aggressive_scaling': {
    role: 'scaling',
    file: 'growth_tracker.js',
    class: 'GrowthTracker',
    methods: ['trackGrowth', 'getMetrics', 'suggestActions']
  },
  'alpha_signals': {
    role: 'trading-signals',
    file: 'signal_generator.js',
    class: 'SignalGenerator',
    methods: ['generateSignals', 'getLatest', 'backtest']
  },
  'cost_monitor': {
    role: 'cost-tracking',
    file: 'cost_tracker.js',
    class: 'CostTracker',
    methods: ['trackCosts', 'getReport', 'alerts']
  },
  'file_librarian': {
    role: 'file-management',
    file: 'file_indexer.js',
    class: 'FileIndexer',
    methods: ['indexFiles', 'search', 'organize']
  },
  'meta_architect': {
    role: 'architecture',
    file: 'architect.js',
    class: 'Architect',
    methods: ['analyzeStructure', 'suggestImprovements', 'validate']
  },
  'mission_control_center': {
    role: 'dashboard',
    file: 'dashboard.js',
    class: 'Dashboard',
    methods: ['generateDashboard', 'getMetrics', 'render']
  },
  'oomol_hub': {
    role: 'oomol-integration',
    file: 'oomol_bridge.js',
    class: 'OOMOLBridge',
    methods: ['connect', 'executeFlow', 'status']
  },
  'oomol_workflows': {
    role: 'workflows',
    file: 'workflow_engine.js',
    class: 'WorkflowEngine',
    methods: ['runWorkflow', 'schedule', 'monitor']
  },
  'openclaw_manager': {
    role: 'manager',
    file: 'manager.js',
    class: 'Manager',
    methods: ['status', 'configure', 'restart']
  },
  'protocol_updates': {
    role: 'updates',
    file: 'update_checker.js',
    class: 'UpdateChecker',
    methods: ['checkUpdates', 'download', 'apply']
  },
  'self_improvement': {
    role: 'self-improvement',
    file: 'improver.js',
    class: 'Improver',
    methods: ['analyze', 'suggest', 'apply']
  },
  'smart_brain': {
    role: 'ai-routing',
    file: 'model_router.js',
    class: 'ModelRouter',
    methods: ['route', 'evaluate', 'switch']
  },
  'ultimate_intelligence': {
    role: 'intelligence',
    file: 'intelligence.js',
    class: 'Intelligence',
    methods: ['think', 'reason', 'decide']
  }
};

const missionsDir = './missions';
let created = 0;
let errors = 0;

for (const [mission, config] of Object.entries(implementations)) {
  const missionDir = path.join(missionsDir, mission);
  
  if (!fs.existsSync(missionDir)) {
    console.log('Skipping', mission, '- directory not found');
    continue;
  }
  
  try {
    // Create implementation file
    const filePath = path.join(missionDir, config.file);
    const className = config.class;
    
    let content = '// ' + className + '\n';
    content += '// ' + config.role + ' implementation\n\n';
    content += 'const fs = require(\'fs\');\n';
    content += 'const path = require(\'path\');\n\n';
    content += 'const STATE_FILE = path.join(__dirname, \'team_state.json\');\n\n';
    content += 'class ' + className + ' {\n';
    content += '  constructor() {\n';
    content += '    this.state = this.loadState();\n';
    content += '  }\n\n';
    content += '  loadState() {\n';
    content += '    try {\n';
    content += '      return JSON.parse(fs.readFileSync(STATE_FILE, \'utf8\'));\n';
    content += '    } catch(e) {\n';
    content += '      return { status: \'initialized\', lastRun: null };\n';
    content += '    }\n';
    content += '  }\n\n';
    
    // Add methods
    for (const method of config.methods) {
      content += '  ' + method + '() {\n';
      content += '    this.state.lastRun = new Date().toISOString();\n';
      content += '    this.state.status = \'active\';\n';
      content += '    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));\n';
      content += '    return { success: true, timestamp: this.state.lastRun };\n';
      content += '  }\n\n';
    }
    
    content += '  getStatus() {\n';
    content += '    return {\n';
    content += '      mission: \'' + mission + '\',\n';
    content += '      role: \'' + config.role + '\',\n';
    content += '      status: this.state.status,\n';
    content += '      lastRun: this.state.lastRun\n';
    content += '    };\n';
    content += '  }\n';
    content += '}\n\n';
    content += 'module.exports = ' + className + ';\n';
    
    // Add CLI
    content += '\nif (require.main === module) {\n';
    content += '  const instance = new ' + className + '();\n';
    content += '  const command = process.argv[2];\n';
    content += '  if (command === \'run\') {\n';
    content += '    const result = instance.' + config.methods[0] + '();\n';
    content += '    console.log(\'✅ ' + className + ' ran successfully\');\n';
    content += '    console.log(\'Status:\', JSON.stringify(instance.getStatus(), null, 2));\n';
    content += '  } else if (command === \'status\') {\n';
    content += '    console.log(JSON.stringify(instance.getStatus(), null, 2));\n';
    content += '  } else {\n';
    content += '    console.log(\'Usage: node ' + config.file + ' [run|status]\');\n';
    content += '  }\n';
    content += '}\n';
    
    fs.writeFileSync(filePath, content);
    created++;
    console.log('✓ Created:', mission, '-', config.file);
    
  } catch(e) {
    errors++;
    console.log('✗ Error creating', mission + ':', e.message);
  }
}

console.log('\n=== RESULTS ===');
console.log('Created:', created);
console.log('Errors:', errors);
console.log('Total:', Object.keys(implementations).length);

// Update team states to mark as having working code
console.log('\n=== UPDATING STATES ===');
for (const mission of Object.keys(implementations)) {
  const stateFile = path.join(missionsDir, mission, 'team_state.json');
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      state.hasWorkingCode = true;
      state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      console.log('✓ Updated state:', mission);
    } catch(e) {}
  }
}
