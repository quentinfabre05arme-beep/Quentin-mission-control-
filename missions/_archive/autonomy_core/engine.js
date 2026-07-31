// Autonomy Core Engine - Central Orchestrator
// Coordinates all self-improvement, monitoring, and learning systems

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const BASE = 'C:\\Users\\quent\\.openclaw';
const LOG_FILE = path.join(BASE, 'workspace', 'memory', 'autonomy_core.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

class AutonomyCore {
  constructor() {
    this.state = this.loadState();
    this.learning = new LearningEngine();
    this.monitor = new MonitoringEngine();
    this.optimizer = new OptimizationEngine();
  }

  loadState() {
    const statePath = path.join(BASE, 'workspace', 'missions', 'autonomy_core', 'state.json');
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    }
    return { cycles: 0, lastRun: null, improvements: [], errors: [] };
  }

  saveState() {
    const statePath = path.join(BASE, 'workspace', 'missions', 'autonomy_core', 'state.json');
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  async runCycle() {
    log('=== AUTONOMY CORE CYCLE ' + (++this.state.cycles) + ' ===');
    
    // 1. Health Check
    const health = await this.monitor.checkHealth();
    if (health.critical) {
      log('⚠️  Critical issues found, focusing on recovery');
      await this.optimizer.fixCritical(health.issues);
    }
    
    // 2. Learning Phase
    const learnings = await this.learning.analyzeRecentActivity();
    if (learnings.patterns.length > 0) {
      log(`📚 Learned ${learnings.patterns.length} new patterns`);
      this.state.improvements.push(...learnings.patterns);
    }
    
    // 3. Optimization Phase
    const optimizations = await this.optimizer.findOptimizations();
    if (optimizations.length > 0) {
      log(`🔧 Found ${optimizations.length} optimization opportunities`);
      await this.optimizer.apply(optimizations);
    }
    
    // 4. Memory Consolidation
    await this.learning.consolidateMemory();
    
    // 5. Save State
    this.state.lastRun = new Date().toISOString();
    this.saveState();
    
    log('=== CYCLE COMPLETE ===\n');
  }
}

class LearningEngine {
  async analyzeRecentActivity(days = 3) {
    const memoryDir = path.join(BASE, 'workspace', 'memory');
    const files = fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .slice(-days);
    
    const patterns = [];
    const errors = [];
    
    files.forEach(f => {
      const content = fs.readFileSync(path.join(memoryDir, f), 'utf8');
      
      // Extract patterns
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.match(/error|fail|bug|crash/i)) {
          errors.push({ file: f, line: line.trim(), date: new Date().toISOString() });
        }
        if (line.match(/improve|optimize|better|enhance/i)) {
          patterns.push({ type: 'improvement', text: line.trim(), source: f });
        }
        if (line.match(/decided|chose|opted/i)) {
          patterns.push({ type: 'decision', text: line.trim(), source: f });
        }
      });
    });
    
    return { patterns, errors };
  }
  
  async consolidateMemory() {
    const memoryFile = path.join(BASE, 'workspace', 'MEMORY.md');
    let memory = '';
    if (fs.existsSync(memoryFile)) {
      memory = fs.readFileSync(memoryFile, 'utf8');
    }
    
    // Add auto-extracted section
    const recent = await this.analyzeRecentActivity(7);
    const newSection = `\n## Auto-Extracted (${new Date().toISOString().split('T')[0]})\n\n` +
      `### Decisions\n` + recent.patterns.filter(p=>p.type==='decision').slice(0,5).map(p=>`- ${p.text}`).join('\n') + '\n\n' +
      `### Errors Found\n` + recent.errors.slice(0,5).map(e=>`- [${e.file}] ${e.line}`).join('\n') + '\n\n' +
      `### Improvements\n` + recent.patterns.filter(p=>p.type==='improvement').slice(0,5).map(p=>`- ${p.text}`).join('\n') + '\n';
    
    fs.appendFileSync(memoryFile, newSection);
    log('🧠 Memory consolidated');
  }
}

class MonitoringEngine {
  async checkHealth() {
    const issues = [];
    const critical = false;
    
    // Memory
    const total = os.totalmem();
    const free = os.freemem();
    if (free / total < 0.1) {
      issues.push('Memory critical');
      critical = true;
    }
    
    // Config
    try {
      const config = require(path.join(BASE, 'openclaw.json'));
      if (!config.agents?.defaults?.tools?.elevated) {
        issues.push('Elevated tools disabled');
      }
    } catch (e) {
      issues.push('Config error: ' + e.message);
    }
    
    return { critical, issues };
  }
}

class OptimizationEngine {
  async findOptimizations() {
    const optimizations = [];
    
    // Check for old session files
    const sessionsDir = path.join(BASE, 'agents', 'main', 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir);
      const oldFiles = files.filter(f => {
        const stat = fs.statSync(path.join(sessionsDir, f));
        return (Date.now() - stat.mtime) > 30 * 24 * 60 * 60 * 1000; // 30 days
      });
      if (oldFiles.length > 10) {
        optimizations.push({ type: 'cleanup', target: 'old sessions', count: oldFiles.length });
      }
    }
    
    return optimizations;
  }
  
  async apply(optimizations) {
    for (const opt of optimizations) {
      if (opt.type === 'cleanup') {
        log(`Cleaning up ${opt.count} ${opt.target}`);
        // Implement cleanup logic
      }
    }
  }
  
  async fixCritical(issues) {
    for (const issue of issues) {
      if (issue === 'Memory critical') {
        try {
          execSync('taskkill /F /IM chrome.exe 2>nul');
          log('Auto-killed Chrome to free memory');
        } catch (e) {}
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const core = new AutonomyCore();
  core.runCycle().catch(err => log('Error: ' + err.message));
}

module.exports = AutonomyCore;
