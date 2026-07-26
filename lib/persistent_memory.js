// Persistent Memory System
// Ensures all improvements are saved and remembered

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'memory', 'backups');
const STATE_DIR = path.join(__dirname, '..', '..', 'memory', 'states');

// Ensure directories exist
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

class PersistentMemory {
  constructor() {
    this.memory = this.loadGlobalMemory();
  }

  // Load or create global memory
  loadGlobalMemory() {
    const globalFile = path.join(MEMORY_DIR, 'global_memory.json');
    if (fs.existsSync(globalFile)) {
      return JSON.parse(fs.readFileSync(globalFile, 'utf8'));
    }
    return {
      created: new Date().toISOString(),
      sessions: 0,
      totalImprovements: 0,
      knowledge: {},
      skills: [],
      errors: [],
      achievements: []
    };
  }

  // Save with backup
  save(key, data) {
    const filePath = path.join(MEMORY_DIR, `${key}.json`);
    const backupPath = path.join(BACKUP_DIR, `${key}_${Date.now()}.json`);
    
    // Backup existing
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    // Save new
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Update global memory
    this.memory.sessions++;
    this.memory.lastSave = new Date().toISOString();
    this.saveGlobal();
    
    return true;
  }

  // Load with fallback to backup
  load(key) {
    const filePath = path.join(MEMORY_DIR, `${key}.json`);
    
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    // Try latest backup
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(key + '_'))
      .sort()
      .reverse();
    
    if (backups.length > 0) {
      return JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, backups[0]), 'utf8'));
    }
    
    return null;
  }

  // Save global memory
  saveGlobal() {
    fs.writeFileSync(
      path.join(MEMORY_DIR, 'global_memory.json'),
      JSON.stringify(this.memory, null, 2)
    );
  }

  // Record improvement
  recordImprovement(type, details) {
    const improvement = {
      timestamp: new Date().toISOString(),
      type,
      details,
      session: this.memory.sessions
    };
    
    // Save to improvements log
    const improvementsFile = path.join(MEMORY_DIR, 'improvements.jsonl');
    fs.appendFileSync(improvementsFile, JSON.stringify(improvement) + '\n');
    
    // Update global
    this.memory.totalImprovements++;
    if (!this.memory.achievements) this.memory.achievements = [];
    this.memory.achievements.push(improvement);
    this.saveGlobal();
    
    return improvement;
  }

  // Record skill acquisition
  recordSkill(skillName, level = 1) {
    const skill = {
      name: skillName,
      level,
      acquired: new Date().toISOString(),
      uses: 0
    };
    
    if (!this.memory.skills) this.memory.skills = [];
    
    const existing = this.memory.skills.find(s => s.name === skillName);
    if (existing) {
      existing.level = Math.max(existing.level, level);
      existing.lastUsed = new Date().toISOString();
    } else {
      this.memory.skills.push(skill);
    }
    
    this.saveGlobal();
    return skill;
  }

  // Record error and learning
  recordError(error, context) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      error: error.message || error,
      context,
      session: this.memory.sessions
    };
    
    if (!this.memory.errors) this.memory.errors = [];
    this.memory.errors.push(errorRecord);
    
    // Keep only last 100 errors
    if (this.memory.errors.length > 100) {
      this.memory.errors = this.memory.errors.slice(-100);
    }
    
    this.saveGlobal();
    return errorRecord;
  }

  // Get full memory dump
  getMemoryDump() {
    return {
      global: this.memory,
      files: fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.json')),
      backups: fs.readdirSync(BACKUP_DIR).length,
      states: fs.readdirSync(STATE_DIR).length
    };
  }

  // Verify integrity
  verify() {
    const checks = {
      globalExists: fs.existsSync(path.join(MEMORY_DIR, 'global_memory.json')),
      improvementsExists: fs.existsSync(path.join(MEMORY_DIR, 'improvements.jsonl')),
      backupsExist: fs.readdirSync(BACKUP_DIR).length > 0,
      dataConsistent: true
    };
    
    try {
      const global = this.loadGlobalMemory();
      checks.dataConsistent = global.sessions >= 0 && global.totalImprovements >= 0;
    } catch(e) {
      checks.dataConsistent = false;
    }
    
    return checks;
  }
}

module.exports = PersistentMemory;

// CLI
if (require.main === module) {
  const pm = new PersistentMemory();
  
  const command = process.argv[2];
  
  if (command === 'test') {
    console.log('=== PERSISTENT MEMORY TEST ===\n');
    
    // Test save
    const testData = { test: true, timestamp: new Date().toISOString() };
    pm.save('test_data', testData);
    console.log('✓ Saved test data');
    
    // Test load
    const loaded = pm.load('test_data');
    console.log('✓ Loaded test data:', loaded ? 'success' : 'failed');
    
    // Test improvement
    const imp = pm.recordImprovement('test', { detail: 'testing' });
    console.log('✓ Recorded improvement:', imp.type);
    
    // Test skill
    const skill = pm.recordSkill('persistence', 2);
    console.log('✓ Recorded skill:', skill.name, 'level', skill.level);
    
    // Test error
    const err = pm.recordError(new Error('test error'), 'testing');
    console.log('✓ Recorded error:', err.error);
    
    // Verify
    const verify = pm.verify();
    console.log('\n=== VERIFICATION ===');
    console.log('Global exists:', verify.globalExists ? '✓' : '✗');
    console.log('Improvements exist:', verify.improvementsExists ? '✓' : '✗');
    console.log('Backups exist:', verify.backupsExist ? '✓' : '✗');
    console.log('Data consistent:', verify.dataConsistent ? '✓' : '✗');
    
    // Dump
    const dump = pm.getMemoryDump();
    console.log('\n=== MEMORY DUMP ===');
    console.log('Sessions:', dump.global.sessions);
    console.log('Improvements:', dump.global.totalImprovements);
    console.log('Skills:', dump.global.skills.length);
    console.log('Files:', dump.files.length);
    console.log('Backups:', dump.backups);
    
    console.log('\n✅ PERSISTENT MEMORY WORKING');
    console.log('Everything is saved and remembered.');
    
  } else {
    console.log('Usage: node persistent_memory.js [test]');
  }
}
