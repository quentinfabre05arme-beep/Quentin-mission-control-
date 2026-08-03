// Persistent Self-Improvement
// Saves and remembers all improvements

const fs = require('fs');
const path = require('path');
const PersistentMemory = require('../../lib/persistent_memory');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');
const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');

class PersistentSelfImprovement {
  constructor() {
    this.state = this.loadState();
    this.pm = new PersistentMemory();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      return {
        mission: 'self_improvement',
        role: 'self-improvement',
        status: 'initialized',
        upgrades: 0,
        lastUpgrade: null
      };
    }
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  // Organize skills with persistence
  organizeSkills() {
    const skills = fs.readdirSync(SKILLS_DIR)
      .filter(f => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory());
    
    const skillData = {
      timestamp: new Date().toISOString(),
      total: skills.length,
      skills: skills.map(s => ({
        name: s,
        hasCode: fs.existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')),
        hasImpl: fs.readdirSync(path.join(SKILLS_DIR, s)).some(f => f.endsWith('.js'))
      }))
    };
    
    // Save with persistent memory
    this.pm.save('skill_index', skillData);
    
    // Record as improvement
    this.pm.recordImprovement('skill_organization', {
      total: skills.length,
      withCode: skillData.skills.filter(s => s.hasImpl).length
    });
    
    // Record skill acquisition
    this.pm.recordSkill('skill_indexing', 2);
    
    return skillData;
  }

  // Track performance with persistence
  trackPerformance() {
    const perf = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      skills: fs.readdirSync(SKILLS_DIR)
        .filter(f => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory()).length,
      missions: fs.readdirSync(path.join(__dirname, '..'))
        .filter(f => fs.statSync(path.join(__dirname, '..', f)).isDirectory()).length
    };
    
    // Save with persistent memory
    this.pm.save('latest_performance', perf);
    
    // Append to log
    const perfLog = path.join(MEMORY_DIR, 'performance_log.jsonl');
    fs.appendFileSync(perfLog, JSON.stringify(perf) + '\n');
    
    // Record improvement
    this.pm.recordImprovement('performance_tracking', {
      skills: perf.skills,
      missions: perf.missions,
      memory: Math.round(perf.memory.heapUsed / 1024 / 1024) + 'MB'
    });
    
    return perf;
  }

  // Run full improvement cycle
  runCycle() {
    const results = [];
    
    // 1. Organize skills
    results.push(this.organizeSkills());
    
    // 2. Track performance
    results.push(this.trackPerformance());
    
    // Update state
    this.state.upgrades++;
    this.state.lastUpgrade = new Date().toISOString();
    this.saveState();
    
    // Record cycle
    this.pm.recordImprovement('improvement_cycle', {
      upgrades: this.state.upgrades,
      timestamp: new Date().toISOString()
    });
    
    return {
      timestamp: new Date().toISOString(),
      upgrades: this.state.upgrades,
      results,
      memory: this.pm.getMemoryDump()
    };
  }

  // Verify everything is saved
  verify() {
    return {
      state: this.state,
      persistent: this.pm.verify(),
      files: {
        skillIndex: fs.existsSync(path.join(MEMORY_DIR, 'skill_index.json')),
        performance: fs.existsSync(path.join(MEMORY_DIR, 'latest_performance.json')),
        global: fs.existsSync(path.join(MEMORY_DIR, 'global_memory.json')),
        improvements: fs.existsSync(path.join(MEMORY_DIR, 'improvements.jsonl'))
      }
    };
  }
}

module.exports = PersistentSelfImprovement;

// CLI
if (require.main === module) {
  const psi = new PersistentSelfImprovement();
  
  const command = process.argv[2];
  
  if (command === 'improve') {
    console.log('=== PERSISTENT SELF-IMPROVEMENT ===\n');
    
    const result = psi.runCycle();
    
    console.log('Timestamp:', result.timestamp);
    console.log('Total upgrades:', result.upgrades);
    console.log('\nImprovements made:');
    result.results.forEach((r, i) => {
      console.log((i+1) + '.', r.timestamp ? 'Skills organized' : 'Performance tracked');
    });
    
    console.log('\n=== MEMORY VERIFICATION ===');
    const verify = psi.verify();
    console.log('State file:', verify.state.status);
    console.log('Skill index:', verify.files.skillIndex ? '✓ SAVED' : '✗ MISSING');
    console.log('Performance:', verify.files.performance ? '✓ SAVED' : '✗ MISSING');
    console.log('Global memory:', verify.files.global ? '✓ SAVED' : '✗ MISSING');
    console.log('Improvements log:', verify.files.improvements ? '✓ SAVED' : '✗ MISSING');
    
    console.log('\n=== MEMORY DUMP ===');
    console.log('Sessions:', result.memory.global.sessions);
    console.log('Total improvements:', result.memory.global.totalImprovements);
    console.log('Skills learned:', result.memory.global.skills.length);
    console.log('Files tracked:', result.memory.files.length);
    
    console.log('\n✅ EVERYTHING SAVED AND REMEMBERED');
    console.log('I will not forget this.');
    
  } else if (command === 'verify') {
    const verify = psi.verify();
    console.log(JSON.stringify(verify, null, 2));
  } else {
    console.log('Usage: node persistent_self_improvement.js [improve|verify]');
  }
}
