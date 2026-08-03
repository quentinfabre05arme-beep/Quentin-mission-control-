#!/usr/bin/env node
/**
 * Self-Healing Orchestrator
 * Master loop: DETECT → FIX → IMPROVE → ASSESS → REPEAT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = path.join(__dirname, 'orchestrator_state.json');
const LOG_FILE = path.join(__dirname, 'orchestrator_log.json');

class SelfHealingOrchestrator {
  constructor() {
    this.state = this.loadState();
    this.cycle = this.state.cycle || 1;
    this.improvements = [];
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return { cycle: 1, lastRun: null, healthScore: 100 };
    }
  }

  saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      cycle: this.cycle,
      lastRun: Date.now(),
      healthScore: this.calculateHealthScore(),
      improvements: this.improvements
    }, null, 2));
  }

  // DETECT: Find problems across all missions
  detect() {
    const issues = [];
    
    // Check cron job health
    const cronStatus = this.checkCronHealth();
    issues.push(...cronStatus.errors);
    
    // Check file system health
    const fsStatus = this.checkFileSystemHealth();
    issues.push(...fsStatus.errors);
    
    // Check API health
    const apiStatus = this.checkAPIHealth();
    issues.push(...apiStatus.errors);
    
    return { issues, counts: { cron: cronStatus.count, fs: fsStatus.count, api: apiStatus.count } };
  }

  checkCronHealth() {
    const errors = [];
    let count = 0;
    
    // Check for failed cron jobs by looking at recent logs
    const logDir = path.join(__dirname, '..', '..', 'logs');
    if (fs.existsSync(logDir)) {
      const logs = fs.readdirSync(logDir).filter(f => f.includes('cron'));
      count = logs.length;
      // Simplified check - in real implementation would parse logs
    }
    
    return { errors, count };
  }

  checkFileSystemHealth() {
    const errors = [];
    let count = 0;
    
    // Check memory files
    const memoryDir = path.join(__dirname, '..', '..', 'memory');
    if (fs.existsSync(memoryDir)) {
      const files = fs.readdirSync(memoryDir);
      count = files.length;
      
      // Check for 0-byte files (skip directories)
      for (const file of files) {
        const filePath = path.join(memoryDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) continue;
        if (stats.size === 0) {
          errors.push({ type: 'empty_file', file, severity: 'medium' });
        }
      }
    }
    
    return { errors, count };
  }

  checkAPIHealth() {
    const errors = [];
    // APIs are checked elsewhere - this is a placeholder
    return { errors, count: 4 };
  }

  // FIX: Apply fixes based on detected issues
  fix(issues) {
    const results = [];
    
    for (const issue of issues) {
      const result = this.fixIssue(issue);
      results.push(result);
    }
    
    return results;
  }

  fixIssue(issue) {
    const strategies = {
      empty_file: () => {
        try {
          fs.unlinkSync(path.join(__dirname, '..', '..', 'memory', issue.file));
          return { success: true, strategy: 'removed_empty_file' };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },
      
      stale_lock: () => {
        try {
          fs.unlinkSync(issue.file);
          return { success: true, strategy: 'removed_stale_lock' };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },
      
      default: () => ({
        success: false,
        strategy: 'unknown_issue_type',
        message: `No fix strategy for ${issue.type}`
      })
    };
    
    const strategy = strategies[issue.type] || strategies.default;
    return strategy();
  }

  // IMPROVE: Learn from patterns and improve
  improve(detectResults, fixResults) {
    const improvements = [];
    
    // Pattern: Recurring errors
    if (detectResults.issues.length > 3) {
      improvements.push({
        type: 'recurring_errors',
        action: 'increase_monitoring_frequency',
        priority: 'high'
      });
    }
    
    // Pattern: All fixes successful
    const successRate = fixResults.filter(r => r.success).length / fixResults.length;
    if (successRate === 1 && detectResults.issues.length > 0) {
      improvements.push({
        type: 'high_fix_success',
        action: 'add_proactive_checks',
        priority: 'medium'
      });
    }
    
    // Pattern: No issues found
    if (detectResults.issues.length === 0) {
      improvements.push({
        type: 'system_stable',
        action: 'reduce_check_frequency',
        priority: 'low'
      });
    }
    
    this.improvements = improvements;
    return improvements;
  }

  // ASSESS: Calculate health and determine next actions
  assess(detectResults, fixResults) {
    const fixed = fixResults.filter(r => r.success).length;
    const failed = fixResults.filter(r => !r.success).length;
    const total = detectResults.issues.length;
    
    const healthScore = total === 0 ? 100 : Math.round((fixed / total) * 100);
    
    const assessment = {
      healthScore,
      status: healthScore >= 90 ? 'healthy' : healthScore >= 70 ? 'degraded' : 'critical',
      issuesDetected: total,
      issuesFixed: fixed,
      issuesFailed: failed,
      improvements: this.improvements.length,
      recommendations: this.generateRecommendations(healthScore)
    };
    
    return assessment;
  }
  
  generateRecommendations(score) {
    if (score >= 90) return ['maintain_current_strategy'];
    if (score >= 70) return ['increase_monitoring', 'review_error_patterns'];
    return ['immediate_intervention_required', 'escalate_to_user'];
  }

  calculateHealthScore() {
    // Placeholder - would calculate from historical data
    return this.state.healthScore || 100;
  }

  // REPEAT: Schedule next run with adaptive frequency
  scheduleNext() {
    // If unhealthy, run more frequently
    const healthScore = this.calculateHealthScore();
    const nextRunDelay = healthScore < 70 ? '15m' : healthScore < 90 ? '30m' : '1h';
    
    return { nextRunDelay, reason: `health_score_${healthScore}` };
  }

  // Main loop
  async run() {
    console.log(`🔄 Self-Healing Cycle #${this.cycle}`);
    console.log('═══════════════════════════════════════');
    
    // DETECT
    console.log('\n🔍 DETECT: Scanning for issues...');
    const detectResults = this.detect();
    console.log(`   Found ${detectResults.issues.length} issues`);
    
    // FIX
    console.log('\n🔧 FIX: Applying fixes...');
    const fixResults = this.fix(detectResults.issues);
    const fixed = fixResults.filter(r => r.success).length;
    console.log(`   Fixed ${fixed}/${detectResults.issues.length} issues`);
    
    // IMPROVE
    console.log('\n📈 IMPROVE: Learning from patterns...');
    const improvements = this.improve(detectResults, fixResults);
    console.log(`   ${improvements.length} improvements identified`);
    
    // ASSESS
    console.log('\n✅ ASSESS: Evaluating health...');
    const assessment = this.assess(detectResults, fixResults);
    console.log(`   Health Score: ${assessment.healthScore}% (${assessment.status})`);
    
    // Schedule next
    const nextRun = this.scheduleNext();
    console.log(`\n⏭️  NEXT RUN: ${nextRun.nextRunDelay} (${nextRun.reason})`);
    
    // Save state
    this.cycle++;
    this.saveState();
    
    // Log
    this.logRun({ detectResults, fixResults, improvements, assessment, nextRun });
    
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Cycle #${this.cycle - 1} complete`);
    
    return assessment;
  }

  logRun(data) {
    const logs = fs.existsSync(LOG_FILE) 
      ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) 
      : { runs: [] };
    
    logs.runs.push({
      cycle: this.cycle - 1,
      timestamp: Date.now(),
      ...data
    });
    
    // Keep last 100 runs
    if (logs.runs.length > 100) logs.runs = logs.runs.slice(-100);
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  }
}

// Run if called directly
if (require.main === module) {
  const orchestrator = new SelfHealingOrchestrator();
  orchestrator.run().catch(console.error);
}

module.exports = SelfHealingOrchestrator;
