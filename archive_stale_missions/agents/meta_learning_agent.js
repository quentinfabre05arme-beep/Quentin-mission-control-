// Meta-Learning Agent
// Learns from my performance to improve all missions

const fs = require('fs');
const path = require('path');

const LEARNING_FILE = path.join(__dirname, '..', '..', 'memory', 'meta_learning.json');
const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');
const MISSIONS_DIR = path.join(__dirname, '..', '..', 'missions');

class MetaLearningAgent {
  constructor() {
    this.learning = this.loadLearning();
  }

  loadLearning() {
    try {
      return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
    } catch(e) {
      return {
        patterns: [],
        improvements: [],
        missionInsights: {},
        skillEffectiveness: {},
        lastUpdate: null
      };
    }
  }

  saveLearning() {
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(this.learning, null, 2));
  }

  // Analyze my performance patterns
  analyzePerformance() {
    // Look at my decision logs
    const decisionsFile = path.join(__dirname, '..', '..', 'logs', 'decisions.jsonl');
    if (!fs.existsSync(decisionsFile)) return null;

    const lines = fs.readFileSync(decisionsFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch(e) { return null; }
      })
      .filter(Boolean);

    // Find patterns in my decisions
    const patterns = {
      totalDecisions: lines.length,
      toolUsage: {},
      successRate: 0,
      commonErrors: [],
      timeDistribution: {}
    };

    let successes = 0;
    const errors = {};

    for (const decision of lines) {
      // Track tool usage
      if (decision.tool) {
        patterns.toolUsage[decision.tool] = (patterns.toolUsage[decision.tool] || 0) + 1;
      }

      // Track success
      if (decision.success) successes++;

      // Track errors
      if (decision.error) {
        errors[decision.error] = (errors[decision.error] || 0) + 1;
      }

      // Track time patterns
      const hour = new Date(decision.timestamp).getHours();
      patterns.timeDistribution[hour] = (patterns.timeDistribution[hour] || 0) + 1;
    }

    patterns.successRate = lines.length > 0 ? successes / lines.length : 0;
    patterns.commonErrors = Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return patterns;
  }

  // Analyze which skills are most effective
  analyzeSkillEffectiveness() {
    const skills = fs.readdirSync(SKILLS_DIR)
      .filter(f => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory());

    const effectiveness = {};

    for (const skill of skills) {
      const skillDir = path.join(SKILLS_DIR, skill);
      const files = fs.readdirSync(skillDir);
      
      // Check if skill has been used (has logs)
      const logFile = path.join(skillDir, 'usage.log');
      if (fs.existsSync(logFile)) {
        const usage = fs.readFileSync(logFile, 'utf8')
          .split('\n')
          .filter(Boolean).length;
        effectiveness[skill] = usage;
      } else {
        effectiveness[skill] = 0;
      }
    }

    return effectiveness;
  }

  // Analyze mission health
  analyzeMissions() {
    const missions = fs.readdirSync(MISSIONS_DIR)
      .filter(f => fs.statSync(path.join(MISSIONS_DIR, f)).isDirectory());

    const insights = {};

    for (const mission of missions) {
      const missionDir = path.join(MISSIONS_DIR, mission);
      
      // Check if mission has state
      const stateFile = path.join(missionDir, 'team_state.json');
      const statusFile = path.join(missionDir, 'STATUS.md');
      
      insights[mission] = {
        hasState: fs.existsSync(stateFile),
        hasStatus: fs.existsSync(statusFile),
        files: fs.readdirSync(missionDir).length,
        healthy: fs.existsSync(stateFile) && fs.existsSync(statusFile)
      };
    }

    return insights;
  }

  // Generate improvement suggestions
  generateImprovements() {
    const performance = this.analyzePerformance();
    const skills = this.analyzeSkillEffectiveness();
    const missions = this.analyzeMissions();

    const improvements = [];

    // Based on performance
    if (performance) {
      if (performance.successRate < 0.8) {
        improvements.push({
          area: 'reliability',
          issue: 'Success rate below 80%',
          suggestion: 'Add retry logic and better error handling',
          priority: 'high'
        });
      }

      if (performance.commonErrors.length > 0) {
        improvements.push({
          area: 'error_handling',
          issue: 'Common errors: ' + performance.commonErrors.map(e => e[0]).join(', '),
          suggestion: 'Create error recovery skills for these patterns',
          priority: 'high'
        });
      }
    }

    // Based on skills
    const unusedSkills = Object.entries(skills)
      .filter(([k, v]) => v === 0)
      .map(([k]) => k);
    
    if (unusedSkills.length > 0) {
      improvements.push({
        area: 'skill_utilization',
        issue: unusedSkills.length + ' skills never used',
        suggestion: 'Integrate unused skills into workflows',
        priority: 'medium'
      });
    }

    // Based on missions
    const unhealthyMissions = Object.entries(missions)
      .filter(([k, v]) => !v.healthy)
      .map(([k]) => k);
    
    if (unhealthyMissions.length > 0) {
      improvements.push({
        area: 'mission_health',
        issue: unhealthyMissions.length + ' missions need attention',
        suggestion: 'Audit and fix unhealthy missions',
        priority: 'critical'
      });
    }

    return improvements;
  }

  // Apply improvements
  applyImprovements(improvements) {
    for (const imp of improvements) {
      this.learning.improvements.push({
        timestamp: new Date().toISOString(),
        ...imp,
        applied: true
      });

      // Create specific actions based on improvement type
      switch(imp.area) {
        case 'reliability':
          this.createReliabilitySkill();
          break;
        case 'error_handling':
          this.createErrorRecoverySkill(imp.issue);
          break;
        case 'skill_utilization':
          this.integrateUnusedSkills();
          break;
        case 'mission_health':
          this.planMissionAudits();
          break;
      }
    }

    this.saveLearning();
  }

  createReliabilitySkill() {
    // This would create a skill for better retry logic
    console.log('Creating reliability enhancement skill...');
  }

  createErrorRecoverySkill(errorPattern) {
    // This would create a skill for specific error recovery
    console.log('Creating error recovery for:', errorPattern);
  }

  integrateUnusedSkills() {
    // This would find ways to use unused skills
    console.log('Planning skill integration...');
  }

  planMissionAudits() {
    // This would schedule audits for unhealthy missions
    console.log('Planning mission audits...');
  }

  // Run full learning cycle
  runCycle() {
    const performance = this.analyzePerformance();
    const skills = this.analyzeSkillEffectiveness();
    const missions = this.analyzeMissions();
    const improvements = this.generateImprovements();

    if (improvements.length > 0) {
      this.applyImprovements(improvements);
    }

    // Save insights
    this.learning.patterns.push({
      timestamp: new Date().toISOString(),
      performance: performance ? {
        totalDecisions: performance.totalDecisions,
        successRate: performance.successRate
      } : null,
      topSkills: Object.entries(skills)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      missionHealth: Object.entries(missions)
        .map(([k, v]) => ({ mission: k, healthy: v.healthy })),
      improvements: improvements.length
    });

    // Keep only last 100 patterns
    if (this.learning.patterns.length > 100) {
      this.learning.patterns = this.learning.patterns.slice(-100);
    }

    this.learning.lastUpdate = new Date().toISOString();
    this.saveLearning();

    return {
      performance,
      skills,
      missions,
      improvements,
      learning: this.learning
    };
  }

  getStatus() {
    return {
      totalPatterns: this.learning.patterns.length,
      totalImprovements: this.learning.improvements.length,
      lastUpdate: this.learning.lastUpdate,
      missionInsights: Object.keys(this.learning.missionInsights || {}).length,
      skillEffectiveness: Object.keys(this.learning.skillEffectiveness || {}).length
    };
  }
}

module.exports = MetaLearningAgent;

// CLI
if (require.main === module) {
  const agent = new MetaLearningAgent();
  
  const command = process.argv[2];
  
  if (command === 'cycle') {
    const result = agent.runCycle();
    console.log('=== META-LEARNING CYCLE ===');
    console.log('Performance:', result.performance ? 'Analyzed' : 'No data');
    console.log('Skills:', Object.keys(result.skills).length, 'analyzed');
    console.log('Missions:', Object.keys(result.missions).length, 'checked');
    console.log('Improvements:', result.improvements.length, 'suggested');
    
    if (result.improvements.length > 0) {
      console.log('\nSuggested improvements:');
      result.improvements.forEach(imp => {
        console.log('  [' + imp.priority + '] ' + imp.area + ': ' + imp.suggestion);
      });
    }
  } else if (command === 'status') {
    console.log(JSON.stringify(agent.getStatus(), null, 2));
  } else {
    console.log('Usage: node meta_learning_agent.js [cycle|status]');
  }
}
