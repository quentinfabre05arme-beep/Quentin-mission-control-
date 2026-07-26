// Universal Mission Memory
// Every mission uses this to remember everything

const fs = require('fs');
const path = require('path');
const UniversalMemory = require('../lib/universal_memory');

class MissionMemory {
  constructor(missionName) {
    this.mission = missionName;
    this.um = new UniversalMemory();
    this.state = this.loadState();
  }

  loadState() {
    const stateFile = path.join(__dirname, 'missions', this.mission, 'team_state.json');
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    return { status: 'unknown' };
  }

  // Remember something from this mission
  remember(data) {
    const memory = {
      type: data.type || 'experience',
      source: this.mission,
      content: data.content || data,
      context: {
        mission: this.mission,
        status: this.state.status,
        ...data.context
      },
      outcome: data.outcome || null,
      timestamp: new Date().toISOString()
    };

    this.um.remember(memory);
    
    // Also save to mission-specific log
    const missionDir = path.join(__dirname, '..', 'missions', this.mission);
    if (fs.existsSync(missionDir)) {
      const logFile = path.join(missionDir, 'memory_log.jsonl');
      fs.appendFileSync(logFile, JSON.stringify(memory) + '\n');
    }

    return memory;
  }

  // Remember a decision
  rememberDecision(decision, options, chosen, reason, outcome) {
    return this.remember({
      type: 'decision',
      content: decision,
      context: { options, chosen, reason },
      outcome
    });
  }

  // Remember knowledge
  rememberKnowledge(fact, source = this.mission) {
    return this.remember({
      type: 'knowledge',
      content: fact,
      source
    });
  }

  // Remember a lesson
  rememberLesson(lesson, context = {}) {
    return this.remember({
      type: 'lesson',
      content: lesson,
      context
    });
  }

  // Remember an error
  rememberError(error, context = {}) {
    return this.remember({
      type: 'error',
      content: error.message || error,
      context,
      outcome: 'failure'
    });
  }

  // Get mission-specific memories
  getMemories(limit = 50) {
    return this.um.search(this.mission).slice(-limit);
  }

  // Get stats for this mission
  getStats() {
    const allStats = this.um.getStats();
    const myMemories = this.getMemories(1000);
    
    return {
      mission: this.mission,
      totalMemories: myMemories.length,
      byType: myMemories.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {}),
      globalStats: allStats
    };
  }
}

module.exports = MissionMemory;

// Example usage for any mission
if (require.main === module) {
  // Simulate a mission using memory
  const mm = new MissionMemory('test_mission');
  
  console.log('=== MISSION MEMORY TEST ===\n');
  
  // Mission does things and remembers
  mm.rememberKnowledge('Node.js file operations use fs module');
  mm.rememberDecision('Which database to use', ['SQLite', 'MongoDB', 'PostgreSQL'], 'SQLite', 'Simple and file-based', 'success');
  mm.rememberLesson('Always test file writes before claiming success');
  mm.remember({ type: 'experience', content: 'Built working file system', outcome: 'success' });
  
  // Show what mission remembers
  const stats = mm.getStats();
  console.log('Mission:', stats.mission);
  console.log('Memories:', stats.totalMemories);
  console.log('By type:', stats.byType);
  console.log('\nGlobal memories:', stats.globalStats.totalMemories);
  
  console.log('\n✅ Mission remembers everything');
}
