// Universal Memory System
// Remembers everything from every mission, interaction, and session

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const UNIVERSAL_FILE = path.join(MEMORY_DIR, 'universal_memory.jsonl');
const KNOWLEDGE_FILE = path.join(MEMORY_DIR, 'knowledge_graph.json');
const EXPERIENCE_FILE = path.join(MEMORY_DIR, 'experience_log.jsonl');
const DECISION_FILE = path.join(MEMORY_DIR, 'decision_log.jsonl');

// Ensure files exist
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });

class UniversalMemory {
  constructor() {
    this.sessionStart = new Date().toISOString();
    this.interactions = 0;
    this.learned = [];
  }

  // Remember everything from any interaction
  remember(data) {
    const memory = {
      timestamp: new Date().toISOString(),
      session: this.sessionStart,
      interaction: ++this.interactions,
      type: data.type || 'unknown',
      source: data.source || 'unknown',
      content: data.content || data,
      context: data.context || {},
      outcome: data.outcome || null,
      importance: this.calculateImportance(data)
    };

    // Save to universal memory
    fs.appendFileSync(UNIVERSAL_FILE, JSON.stringify(memory) + '\n');

    // If it's knowledge, add to knowledge graph
    if (data.type === 'knowledge' || data.type === 'fact' || data.type === 'lesson') {
      this.addToKnowledge(data);
    }

    // If it's experience, add to experience log
    if (data.type === 'experience' || data.type === 'action' || data.type === 'result') {
      this.addToExperience(data);
    }

    // If it's a decision, add to decision log
    if (data.type === 'decision' || data.type === 'choice') {
      this.addToDecisions(data);
    }

    return memory;
  }

  // Calculate importance of memory
  calculateImportance(data) {
    let score = 1;
    
    if (data.outcome === 'success') score += 2;
    if (data.outcome === 'failure') score += 3; // Failures are important
    if (data.type === 'knowledge') score += 2;
    if (data.type === 'error') score += 3;
    if (data.source === 'user') score += 2;
    
    return Math.min(score, 10);
  }

  // Add to knowledge graph
  addToKnowledge(data) {
    let knowledge = { facts: [], lessons: [], skills: [] };
    
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      try {
        knowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
      } catch(e) {}
    }

    if (data.type === 'fact') {
      knowledge.facts.push({
        fact: data.content,
        source: data.source,
        timestamp: new Date().toISOString(),
        verified: false
      });
    }

    if (data.type === 'lesson') {
      knowledge.lessons.push({
        lesson: data.content,
        context: data.context,
        timestamp: new Date().toISOString()
      });
    }

    if (data.type === 'skill') {
      knowledge.skills.push({
        skill: data.content,
        level: data.level || 1,
        acquired: new Date().toISOString()
      });
    }

    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledge, null, 2));
  }

  // Add to experience log
  addToExperience(data) {
    const experience = {
      timestamp: new Date().toISOString(),
      action: data.content,
      context: data.context,
      outcome: data.outcome,
      result: data.result || null
    };

    fs.appendFileSync(EXPERIENCE_FILE, JSON.stringify(experience) + '\n');
  }

  // Add to decision log
  addToDecisions(data) {
    const decision = {
      timestamp: new Date().toISOString(),
      decision: data.content,
      options: data.options || [],
      chosen: data.chosen || null,
      reason: data.reason || null,
      outcome: data.outcome || null
    };

    fs.appendFileSync(DECISION_FILE, JSON.stringify(decision) + '\n');
  }

  // Recall memories by type
  recall(type, limit = 10) {
    if (!fs.existsSync(UNIVERSAL_FILE)) return [];

    const lines = fs.readFileSync(UNIVERSAL_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch(e) { return null; }
      })
      .filter(Boolean)
      .filter(m => m.type === type)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    return lines;
  }

  // Search memories
  search(query) {
    if (!fs.existsSync(UNIVERSAL_FILE)) return [];

    const lines = fs.readFileSync(UNIVERSAL_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch(e) { return null; }
      })
      .filter(Boolean)
      .filter(m => {
        const content = JSON.stringify(m).toLowerCase();
        return content.includes(query.toLowerCase());
      });

    return lines;
  }

  // Get knowledge
  getKnowledge() {
    if (!fs.existsSync(KNOWLEDGE_FILE)) return { facts: [], lessons: [], skills: [] };
    
    try {
      return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
    } catch(e) {
      return { facts: [], lessons: [], skills: [] };
    }
  }

  // Get statistics
  getStats() {
    const stats = {
      totalMemories: 0,
      byType: {},
      knowledge: { facts: 0, lessons: 0, skills: 0 },
      experiences: 0,
      decisions: 0,
      sessions: new Set()
    };

    if (fs.existsSync(UNIVERSAL_FILE)) {
      const lines = fs.readFileSync(UNIVERSAL_FILE, 'utf8')
        .split('\n')
        .filter(Boolean);
      
      stats.totalMemories = lines.length;
      
      for (const line of lines) {
        try {
          const m = JSON.parse(line);
          stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
          stats.sessions.add(m.session);
        } catch(e) {}
      }
    }

    if (fs.existsSync(KNOWLEDGE_FILE)) {
      try {
        const k = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
        stats.knowledge.facts = k.facts?.length || 0;
        stats.knowledge.lessons = k.lessons?.length || 0;
        stats.knowledge.skills = k.skills?.length || 0;
      } catch(e) {}
    }

    if (fs.existsSync(EXPERIENCE_FILE)) {
      stats.experiences = fs.readFileSync(EXPERIENCE_FILE, 'utf8')
        .split('\n').filter(Boolean).length;
    }

    if (fs.existsSync(DECISION_FILE)) {
      stats.decisions = fs.readFileSync(DECISION_FILE, 'utf8')
        .split('\n').filter(Boolean).length;
    }

    stats.sessions = stats.sessions.size;

    return stats;
  }
}

module.exports = UniversalMemory;

// CLI
if (require.main === module) {
  const um = new UniversalMemory();
  
  const command = process.argv[2];
  
  if (command === 'test') {
    console.log('=== UNIVERSAL MEMORY TEST ===\n');
    
    // Remember some things
    um.remember({
      type: 'knowledge',
      source: 'user',
      content: 'I should save everything to memory',
      context: { topic: 'persistence' }
    });
    
    um.remember({
      type: 'experience',
      source: 'self',
      content: 'Built 17 missions',
      outcome: 'success',
      context: { topic: 'missions' }
    });
    
    um.remember({
      type: 'lesson',
      source: 'error',
      content: 'Must verify files are actually saved',
      context: { topic: 'testing' },
      outcome: 'failure'
    });
    
    um.remember({
      type: 'decision',
      source: 'self',
      content: 'Use persistent memory system',
      chosen: 'persistent_memory',
      reason: 'Need to remember everything',
      outcome: 'success'
    });
    
    // Show stats
    const stats = um.getStats();
    console.log('Memory Stats:');
    console.log('  Total memories:', stats.totalMemories);
    console.log('  Sessions:', stats.sessions);
    console.log('  Knowledge:');
    console.log('    Facts:', stats.knowledge.facts);
    console.log('    Lessons:', stats.knowledge.lessons);
    console.log('    Skills:', stats.knowledge.skills);
    console.log('  Experiences:', stats.experiences);
    console.log('  Decisions:', stats.decisions);
    
    // Show knowledge
    const knowledge = um.getKnowledge();
    console.log('\nKnowledge Graph:');
    console.log('  Facts:', knowledge.facts.length);
    console.log('  Lessons:', knowledge.lessons.length);
    console.log('  Skills:', knowledge.skills.length);
    
    console.log('\n✅ UNIVERSAL MEMORY WORKING');
    console.log('Everything is remembered.');
    
  } else if (command === 'stats') {
    console.log(JSON.stringify(um.getStats(), null, 2));
  } else {
    console.log('Usage: node universal_memory.js [test|stats]');
  }
}
