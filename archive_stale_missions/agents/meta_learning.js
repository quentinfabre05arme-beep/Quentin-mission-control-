// Working Meta-Learning Implementation
// Analyzes my performance and suggests improvements

const fs = require('fs');
const path = require('path');

const LEARNING_FILE = path.join(__dirname, '..', '..', 'memory', 'meta_learning.json');
const DECISIONS_FILE = path.join(__dirname, '..', '..', 'logs', 'decisions.jsonl');
const MISSIONS_DIR = path.join(__dirname, '..', '..', 'missions');

class MetaLearning {
  constructor() {
    this.learning = this.loadLearning();
    this.insights = [];
  }

  loadLearning() {
    try {
      return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
    } catch(e) {
      return { patterns: [], improvements: [], lastUpdate: null };
    }
  }

  saveLearning() {
    this.learning.lastUpdate = new Date().toISOString();
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(this.learning, null, 2));
  }

  // Analyze my decisions
  analyzeDecisions() {
    if (!fs.existsSync(DECISIONS_FILE)) return null;

    const lines = fs.readFileSync(DECISIONS_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch(e) { return null; }
      })
      .filter(Boolean);

    if (lines.length === 0) return null;

    // Calculate metrics
    const total = lines.length;
    const successes = lines.filter(d => d.success).length;
    const errors = lines.filter(d => d.error).length;
    
    // Tool usage
    const toolUsage = {};
    for (const d of lines) {
      if (d.tool) {
        toolUsage[d.tool] = (toolUsage[d.tool] || 0) + 1;
      }
    }

    // Time patterns
    const hourDistribution = {};
    for (const d of lines) {
      const hour = new Date(d.timestamp).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    }

    return {
      total,
      successRate: total > 0 ? successes / total : 0,
      errorRate: total > 0 ? errors / total : 0,
      topTools: Object.entries(toolUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      peakHours: Object.entries(hourDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    };
  }

  // Analyze missions health
  analyzeMissions() {
    const missions = fs.readdirSync(MISSIONS_DIR)
      .filter(f => fs.statSync(path.join(MISSIONS_DIR, f)).isDirectory());

    const health = [];
    for (const mission of missions) {
      const stateFile = path.join(MISSIONS_DIR, mission, 'team_state.json');
      let status = 'unknown';
      let hasState = false;
      
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          status = state.status || 'unknown';
          hasState = true;
        } catch(e) {}
      }

      health.push({
        mission,
        status,
        hasState,
        healthy: status === 'active' || status === 'running' || status === 'initialized'
      });
    }

    return health;
  }

  // Generate insights
  generateInsights() {
    const decisions = this.analyzeDecisions();
    const missions = this.analyzeMissions();

    const insights = [];

    if (decisions) {
      if (decisions.successRate < 0.8) {
        insights.push({
          type: 'performance',
          severity: 'warning',
          message: 'Success rate is ' + (decisions.successRate * 100).toFixed(1) + '%',
          suggestion: 'Review error patterns and add retry logic'
        });
      }

      if (decisions.errorRate > 0.2) {
        insights.push({
          type: 'reliability',
          severity: 'critical',
          message: 'Error rate is ' + (decisions.errorRate * 100).toFixed(1) + '%',
          suggestion: 'Implement error recovery and fallback strategies'
        });
      }
    }

    const unhealthyMissions = missions.filter(m => !m.healthy);
    if (unhealthyMissions.length > 0) {
      insights.push({
        type: 'mission_health',
        severity: 'warning',
        message: unhealthyMissions.length + ' missions need attention',
        suggestion: 'Audit and initialize unhealthy missions'
      });
    }

    return insights;
  }

  // Run full analysis
  runAnalysis() {
    const decisions = this.analyzeDecisions();
    const missions = this.analyzeMissions();
    const insights = this.generateInsights();

    // Record learning
    this.learning.patterns.push({
      timestamp: new Date().toISOString(),
      decisions: decisions ? {
        total: decisions.total,
        successRate: decisions.successRate
      } : null,
      missions: missions.filter(m => m.healthy).length + '/' + missions.length + ' healthy',
      insights: insights.length
    });

    // Keep last 100
    if (this.learning.patterns.length > 100) {
      this.learning.patterns = this.learning.patterns.slice(-100);
    }

    this.saveLearning();

    return {
      decisions,
      missions,
      insights,
      timestamp: new Date().toISOString()
    };
  }

  getStatus() {
    return {
      totalPatterns: this.learning.patterns.length,
      lastUpdate: this.learning.lastUpdate,
      hasData: fs.existsSync(DECISIONS_FILE)
    };
  }
}

module.exports = MetaLearning;

// CLI
if (require.main === module) {
  const ml = new MetaLearning();
  
  const command = process.argv[2];
  
  if (command === 'analyze') {
    const result = ml.runAnalysis();
    console.log('=== META-LEARNING ANALYSIS ===');
    console.log('Timestamp:', result.timestamp);
    
    if (result.decisions) {
      console.log('\nDecisions:');
      console.log('  Total:', result.decisions.total);
      console.log('  Success rate:', (result.decisions.successRate * 100).toFixed(1) + '%');
    }
    
    console.log('\nMissions:', result.missions.length, 'checked');
    console.log('Healthy:', result.missions.filter(m => m.healthy).length);
    
    if (result.insights.length > 0) {
      console.log('\nInsights:');
      result.insights.forEach(i => {
        console.log('  [' + i.severity + '] ' + i.type + ': ' + i.message);
        console.log('    → ' + i.suggestion);
      });
    }
  } else if (command === 'status') {
    console.log(JSON.stringify(ml.getStatus(), null, 2));
  } else {
    console.log('Usage: node meta_learning.js [analyze|status]');
  }
}
