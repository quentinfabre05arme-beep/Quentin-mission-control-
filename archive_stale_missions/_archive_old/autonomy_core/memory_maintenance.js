#!/usr/bin/env node
/**
 * Safe Memory Maintenance - Self-Healing Edition
 * Recurrent task: detect → fix → improve → assess → repeat
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');
const LOG_FILE = path.join(__dirname, 'maintenance_log.json');
const LOCK_FILE = path.join(__dirname, '.memory_lock');

class MemoryMaintenance {
  constructor() {
    this.stats = {
      started: Date.now(),
      errors: [],
      fixes: [],
      improvements: []
    };
  }

  // Self-healing: Detect issues
  detectIssues() {
    const issues = [];
    
    // Check for file lock
    if (fs.existsSync(LOCK_FILE)) {
      const lockAge = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
      if (lockAge > 60000) { // Lock older than 60s is stale
        issues.push({ type: 'stale_lock', file: LOCK_FILE, age: lockAge });
      }
    }
    
    // Check for truncated memory files
    const today = new Date().toISOString().split('T')[0];
    const dailyFile = path.join(MEMORY_DIR, `${today}.md`);
    
    if (fs.existsSync(dailyFile)) {
      const content = fs.readFileSync(dailyFile, 'utf8');
      if (content.length < 100) {
        issues.push({ type: 'truncated_file', file: dailyFile, size: content.length });
      }
      
      // Check for missing headers
      if (!content.includes('# ') && content.length > 0) {
        issues.push({ type: 'missing_header', file: dailyFile });
      }
    }
    
    return issues;
  }

  // Self-healing: Fix issues
  fixIssues(issues) {
    for (const issue of issues) {
      try {
        switch (issue.type) {
          case 'stale_lock':
            fs.unlinkSync(LOCK_FILE);
            this.stats.fixes.push({ issue: 'stale_lock', time: Date.now(), status: 'fixed' });
            break;
            
          case 'truncated_file':
          case 'missing_header':
            // Archive corrupted file and recreate
            const backup = `${issue.file}.backup.${Date.now()}`;
            if (fs.existsSync(issue.file)) {
              fs.renameSync(issue.file, backup);
            }
            this.stats.fixes.push({ 
              issue: issue.type, 
              file: issue.file, 
              backup: backup,
              time: Date.now(), 
              status: 'archived' 
            });
            break;
        }
      } catch (e) {
        this.stats.errors.push({ issue: issue.type, error: e.message, time: Date.now() });
      }
    }
  }

  // Self-improvement: Assess and improve
  async assessAndImprove() {
    // Load previous run stats
    let previousStats = null;
    if (fs.existsSync(LOG_FILE)) {
      try {
        const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        if (logs.runs && logs.runs.length > 0) {
          previousStats = logs.runs[logs.runs.length - 1];
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Compare with previous run
    if (previousStats) {
      const errorTrend = this.stats.errors.length - (previousStats.errors?.length || 0);
      const fixTrend = this.stats.fixes.length - (previousStats.fixes?.length || 0);
      
      if (errorTrend > 0) {
        this.stats.improvements.push({
          type: 'error_increase_detected',
          message: `Errors increased by ${errorTrend}. Will add more aggressive locking.`,
          action: 'next_run_use_fsync'
        });
      }
      
      if (this.stats.errors.length === 0 && previousStats.errors?.length > 0) {
        this.stats.improvements.push({
          type: 'stability_achieved',
          message: 'No errors this run. Previous issues resolved.',
          action: 'maintain_current_strategy'
        });
      }
    }
    
    // Save stats for next run
    this.saveStats();
  }

  // Safe file write with locking
  safeWrite(filePath, content) {
    // Create lock
    fs.writeFileSync(LOCK_FILE, Date.now().toString());
    
    try {
      // Write to temp file first
      const tempFile = `${filePath}.tmp`;
      fs.writeFileSync(tempFile, content, { encoding: 'utf8', flag: 'w' });
      
      // Sync to disk
      const fd = fs.openSync(tempFile, 'r+');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      
      // Atomic rename
      fs.renameSync(tempFile, filePath);
      
      return { success: true };
    } finally {
      // Always remove lock
      try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
    }
  }

  saveStats() {
    const logs = fs.existsSync(LOG_FILE) 
      ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) 
      : { runs: [] };
    
    logs.runs.push({
      timestamp: Date.now(),
      date: new Date().toISOString(),
      ...this.stats,
      duration: Date.now() - this.stats.started
    });
    
    // Keep only last 50 runs
    if (logs.runs.length > 50) {
      logs.runs = logs.runs.slice(-50);
    }
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  }

  async run() {
    console.log('🔧 Memory Maintenance - Self-Healing Mode');
    
    // Step 1: Detect
    const issues = this.detectIssues();
    console.log(`📊 Detected ${issues.length} issues:`, issues.map(i => i.type));
    
    // Step 2: Fix
    if (issues.length > 0) {
      this.fixIssues(issues);
      console.log(`🔧 Fixed ${this.stats.fixes.length} issues`);
    }
    
    // Step 3: Assess & Improve
    await this.assessAndImprove();
    console.log(`📈 Improvements identified: ${this.stats.improvements.length}`);
    
    // Step 4: Report
    const report = {
      status: this.stats.errors.length === 0 ? 'healthy' : 'degraded',
      issues_detected: issues.length,
      issues_fixed: this.stats.fixes.length,
      errors: this.stats.errors.length,
      improvements: this.stats.improvements,
      duration_ms: Date.now() - this.stats.started
    };
    
    console.log('\n✅ Maintenance complete:', JSON.stringify(report, null, 2));
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const maintenance = new MemoryMaintenance();
  maintenance.run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = MemoryMaintenance;
