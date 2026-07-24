#!/usr/bin/env node
/**
 * SELF-HEALING ORCHESTRATOR
 * DETECT → FIX → IMPROVE → ASSESS → REPEAT
 * 
 * Runs hourly: checks system health, auto-fixes issues, logs improvements
 * Reports ONLY if: health score < 70%, >5 issues detected, or self-healing fails
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.join(__dirname, 'logs');
const STATE_FILE = path.join(__dirname, 'state.json');
const LOG_FILE = path.join(__dirname, 'orchestrator_log.json');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

class SelfHealingOrchestrator {
  constructor() {
    this.state = this.loadState();
    this.issues = [];
    this.fixes = [];
    this.improvements = [];
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: DETECT — Scan all systems for issues
  // ═══════════════════════════════════════════════════════════════════
  
  async detect() {
    console.log('🔍 PHASE 1: DETECT');
    console.log('─'.repeat(50));
    
    this.issues = [];
    
    // Check 1: Mission Control Center health
    await this.checkMissionControl();
    
    // Check 2: Dashboard freshness
    await this.checkDashboardFreshness();
    
    // Check 3: Market data currency
    await this.checkMarketData();
    
    // Check 4: Research system status
    await this.checkResearchSystem();
    
    // Check 5: File existence for critical files
    await this.checkCriticalFiles();
    
    // Check 6: Git status (uncommitted changes)
    await this.checkGitStatus();
    
    // Check 7: Log file sizes (rotations needed)
    await this.checkLogRotation();
    
    // Check 8: Disk space
    await this.checkDiskSpace();
    
    console.log(`   Found ${this.issues.length} issue(s)`);
    return this.issues.length;
  }

  async checkMissionControl() {
    const mccLog = path.join(__dirname, '..', 'mission_control_center', 'orchestrator.log');
    if (!fs.existsSync(mccLog)) {
      this.issues.push({
        severity: 'medium',
        system: 'Mission Control',
        issue: 'No orchestrator log found',
        detail: 'Mission Control Center may not be running'
      });
      return;
    }
    
    try {
      const logs = JSON.parse(fs.readFileSync(mccLog, 'utf8'));
      if (logs.runs && logs.runs.length > 0) {
        const lastRun = logs.runs[logs.runs.length - 1];
        const hoursSince = (Date.now() - lastRun.timestamp) / 3600000;
        
        if (hoursSince > 2) {
          this.issues.push({
            severity: 'medium',
            system: 'Mission Control',
            issue: `Stale orchestrator data (${hoursSince.toFixed(1)}h ago)`,
            detail: 'Last cycle may have failed'
          });
        }
        
        if (lastRun.globalHealth < 70) {
          this.issues.push({
            severity: 'high',
            system: 'Mission Control',
            issue: `Low global health: ${lastRun.globalHealth}%`,
            detail: 'Multiple systems degraded'
          });
        }
      }
    } catch (e) {
      this.issues.push({
        severity: 'low',
        system: 'Mission Control',
        issue: 'Cannot parse orchestrator log',
        detail: e.message
      });
    }
  }

  async checkDashboardFreshness() {
    const indexHtml = path.join(__dirname, '..', '..', 'mission_control', 'index.html');
    if (!fs.existsSync(indexHtml)) return;
    
    const stats = fs.statSync(indexHtml);
    const hoursSince = (Date.now() - stats.mtimeMs) / 3600000;
    
    if (hoursSince > 4) {
      this.issues.push({
        severity: 'medium',
        system: 'Dashboard',
        issue: `Dashboard stale (${hoursSince.toFixed(1)}h since update)`,
        detail: 'Timestamp sync may be failing'
      });
    }
  }

  async checkMarketData() {
    const marketData = path.join(__dirname, '..', '..', 'mission_control', 'market_data.json');
    if (!fs.existsSync(marketData)) {
      this.issues.push({
        severity: 'high',
        system: 'Market Data',
        issue: 'market_data.json missing',
        detail: 'Price data completely unavailable'
      });
      return;
    }
    
    const stats = fs.statSync(marketData);
    const hoursSince = (Date.now() - stats.mtimeMs) / 3600000;
    
    if (hoursSince > 2) {
      this.issues.push({
        severity: 'medium',
        system: 'Market Data',
        issue: `Price data stale (${hoursSince.toFixed(1)}h old)`,
        detail: 'Market data service may be down'
      });
    }
  }

  async checkResearchSystem() {
    const today = new Date().toISOString().slice(0, 10);
    const altData = path.join(__dirname, '..', '..', 'investment_fund', 'data', 'alternative', `${today}.json`);
    
    if (!fs.existsSync(altData)) {
      // Check if any alternative data exists
      const altDir = path.join(__dirname, '..', '..', 'investment_fund', 'data', 'alternative');
      if (fs.existsSync(altDir)) {
        const files = fs.readdirSync(altDir).filter(f => f.endsWith('.json'));
        if (files.length === 0) {
          this.issues.push({
            severity: 'medium',
            system: 'Research',
            issue: 'No alternative data files found',
            detail: 'Research pipeline may not be running'
          });
        }
      }
    }
  }

  async checkCriticalFiles() {
    const criticalFiles = [
      'mission_control/index.html',
      'mission_control/market_data.json',
      'missions/autonomy_core/engine.js',
      'missions/alpha_signals/bot.js'
    ];
    
    for (const file of criticalFiles) {
      const fullPath = path.join(__dirname, '..', '..', file);
      if (!fs.existsSync(fullPath)) {
        this.issues.push({
          severity: 'high',
          system: 'File Integrity',
          issue: `Missing critical file: ${file}`,
          detail: 'File may have been deleted or moved'
        });
      }
    }
  }

  async checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { 
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (status.trim().length > 0) {
        const lines = status.trim().split('\n');
        if (lines.length > 10) {
          this.issues.push({
            severity: 'low',
            system: 'Git',
            issue: `${lines.length} uncommitted changes`,
            detail: 'Consider committing to prevent data loss'
          });
        }
      }
    } catch (e) {
      // Git not available or not a repo — not critical
    }
  }

  async checkLogRotation() {
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logsDir)) return;
    
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        this.issues.push({
          severity: 'low',
          system: 'Logs',
          issue: `Large log file: ${file} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`,
          detail: 'Log rotation may be needed'
        });
      }
    }
  }

  async checkDiskSpace() {
    try {
      // Check if we're on Windows and can use wmic
      const output = execSync('wmic logicaldisk get size,freespace,caption', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const lines = output.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const free = parseInt(parts[0]);
          const total = parseInt(parts[1]);
          const drive = parts[2];
          
          if (total > 0) {
            const percentFree = (free / total) * 100;
            if (percentFree < 10) {
              this.issues.push({
                severity: 'high',
                system: 'Disk Space',
                issue: `Low disk space on ${drive}: ${percentFree.toFixed(1)}% free`,
                detail: 'Critical — may cause system failures'
              });
            } else if (percentFree < 20) {
              this.issues.push({
                severity: 'medium',
                system: 'Disk Space',
                issue: `Low disk space on ${drive}: ${percentFree.toFixed(1)}% free`,
                detail: 'Consider cleaning up old files'
              });
            }
          }
        }
      }
    } catch (e) {
      // Disk check failed — not critical
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: FIX — Attempt automated fixes for detected issues
  // ═══════════════════════════════════════════════════════════════════
  
  async fix() {
    console.log('\n🔧 PHASE 2: FIX');
    console.log('─'.repeat(50));
    
    this.fixes = [];
    
    for (const issue of this.issues) {
      const fix = await this.attemptFix(issue);
      if (fix.success) {
        this.fixes.push(fix);
        console.log(`   ✅ FIXED: ${issue.issue}`);
      } else {
        console.log(`   ❌ CANNOT FIX: ${issue.issue} — ${fix.reason}`);
      }
    }
    
    console.log(`   Applied ${this.fixes.length}/${this.issues.length} fixes`);
    return this.fixes.length;
  }

  async attemptFix(issue) {
    switch (issue.system) {
      case 'Market Data':
        if (issue.issue.includes('stale')) {
          return await this.fixMarketData();
        }
        break;
        
      case 'Dashboard':
        if (issue.issue.includes('stale')) {
          return await this.fixDashboard();
        }
        break;
        
      case 'Logs':
        if (issue.issue.includes('Large log')) {
          return await this.fixLogRotation(issue.issue);
        }
        break;
        
      case 'Git':
        return await this.fixGitCommit();
        
      case 'Research':
        return await this.fixResearch();
    }
    
    return { success: false, reason: 'No automated fix available', issue };
  }

  async fixMarketData() {
    try {
      const script = path.join(__dirname, '..', '..', 'mission_control', 'market_data_service.js');
      if (fs.existsSync(script)) {
        execSync(`node "${script}"`, { 
          cwd: path.join(__dirname, '..', '..', 'mission_control'),
          stdio: 'pipe',
          timeout: 30000
        });
        return { success: true, action: 'Refreshed market data via market_data_service.js' };
      }
      return { success: false, reason: 'market_data_service.js not found' };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  async fixDashboard() {
    // Dashboard staleness is a symptom — the real fix is to run the review cycle
    // This is handled by the Mission Control Center, not auto-fixed here
    return { success: false, reason: 'Requires Mission Control orchestration — escalate' };
  }

  async fixLogRotation(issueText) {
    try {
      const match = issueText.match(/Large log file: (.+) \(/);
      if (match) {
        const filename = match[1];
        const filePath = path.join(__dirname, '..', '..', 'logs', filename);
        
        if (fs.existsSync(filePath)) {
          const backupName = `${filename}.${Date.now()}.bak`;
          const backupPath = path.join(__dirname, '..', '..', 'logs', backupName);
          
          fs.renameSync(filePath, backupPath);
          fs.writeFileSync(filePath, ''); // Create fresh log
          
          return { success: true, action: `Rotated ${filename} to ${backupName}` };
        }
      }
      return { success: false, reason: 'Could not parse filename from issue' };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  async fixGitCommit() {
    return { success: false, reason: 'Auto-commit disabled — requires human review' };
  }

  async fixResearch() {
    return { success: false, reason: 'Research system requires API keys — manual trigger needed' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: IMPROVE — Propose and log improvements
  // ═══════════════════════════════════════════════════════════════════
  
  async improve() {
    console.log('\n📈 PHASE 3: IMPROVE');
    console.log('─'.repeat(50));
    
    this.improvements = [];
    
    // Analyze patterns in issues
    const systemCounts = {};
    for (const issue of this.issues) {
      systemCounts[issue.system] = (systemCounts[issue.system] || 0) + 1;
    }
    
    // Generate improvement suggestions
    for (const [system, count] of Object.entries(systemCounts)) {
      if (count >= 2) {
        this.improvements.push({
          system,
          suggestion: `${system} has ${count} recurring issues — consider deeper refactor`,
          priority: 'medium'
        });
      }
    }
    
    // Check for new opportunities
    const allHealthy = this.issues.length === 0;
    if (allHealthy) {
      this.improvements.push({
        system: 'Global',
        suggestion: 'All systems healthy — opportunity to add new monitoring checks',
        priority: 'low'
      });
    }
    
    for (const improvement of this.improvements) {
      console.log(`   💡 ${improvement.system}: ${improvement.suggestion}`);
    }
    
    return this.improvements.length;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4: ASSESS — Calculate health score and determine report
  // ═══════════════════════════════════════════════════════════════════
  
  async assess() {
    console.log('\n📊 PHASE 4: ASSESS');
    console.log('─'.repeat(50));
    
    // Calculate health score
    const maxScore = 100;
    let deductions = 0;
    
    for (const issue of this.issues) {
      switch (issue.severity) {
        case 'high': deductions += 15; break;
        case 'medium': deductions += 8; break;
        case 'low': deductions += 3; break;
      }
    }
    
    // Bonus for successful fixes
    const fixBonus = this.fixes.length * 5;
    
    const healthScore = Math.max(0, Math.min(100, maxScore - deductions + fixBonus));
    
    // Determine if we need to report
    const shouldReport = healthScore < 70 || this.issues.length > 5 || this.fixes.length < this.issues.length / 2;
    
    console.log(`   Health Score: ${healthScore}%`);
    console.log(`   Issues: ${this.issues.length} | Fixed: ${this.fixes.length} | Improvements: ${this.improvements.length}`);
    console.log(`   Report Required: ${shouldReport ? 'YES' : 'NO (silent mode)'}`);
    
    return {
      healthScore,
      issues: this.issues.length,
      fixes: this.fixes.length,
      improvements: this.improvements.length,
      shouldReport,
      timestamp: new Date().toISOString()
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════
  
  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return { runs: [], totalIssuesFixed: 0 };
    }
  }
  
  saveState(assessment) {
    const state = {
      ...this.state,
      lastRun: assessment,
      totalRuns: (this.state.totalRuns || 0) + 1,
      totalIssuesDetected: (this.state.totalIssuesDetected || 0) + this.issues.length,
      totalIssuesFixed: (this.state.totalIssuesFixed || 0) + this.fixes.length
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
  
  logRun(assessment) {
    const logs = fs.existsSync(LOG_FILE) 
      ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) 
      : { runs: [] };
    
    const run = {
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      cycle: (this.state.totalRuns || 0) + 1,
      issues: this.issues,
      fixes: this.fixes,
      improvements: this.improvements,
      assessment
    };
    
    logs.runs.push(run);
    if (logs.runs.length > 200) logs.runs = logs.runs.slice(-200);
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN LOOP — DETECT → FIX → IMPROVE → ASSESS → REPEAT
  // ═══════════════════════════════════════════════════════════════════
  
  async run() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     SELF-HEALING ORCHESTRATOR — DETECT→FIX→IMPROVE→ASSESS  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`   Started: ${new Date().toISOString()}\n`);
    
    // Phase 1: DETECT
    const issueCount = await this.detect();
    
    // Phase 2: FIX
    const fixCount = await this.fix();
    
    // Phase 3: IMPROVE
    const improvementCount = await this.improve();
    
    // Phase 4: ASSESS
    const assessment = await this.assess();
    
    // Save state
    this.saveState(assessment);
    this.logRun(assessment);
    
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ Cycle Complete — Health: ${assessment.healthScore}% | Issues: ${issueCount} | Fixed: ${fixCount}`);
    console.log('═'.repeat(60));
    
    return assessment;
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMMAND LINE INTERFACE
// ═══════════════════════════════════════════════════════════════════

if (require.main === module) {
  const command = process.argv[2];
  const orchestrator = new SelfHealingOrchestrator();
  
  switch (command) {
    case 'status':
      // Quick status check
      console.log('🔍 Self-Healing Orchestrator Status\n');
      const state = orchestrator.loadState();
      console.log(`   Total Runs: ${state.totalRuns || 0}`);
      console.log(`   Total Issues Detected: ${state.totalIssuesDetected || 0}`);
      console.log(`   Total Issues Fixed: ${state.totalIssuesFixed || 0}`);
      if (state.lastRun) {
        console.log(`   Last Health Score: ${state.lastRun.healthScore}%`);
        console.log(`   Last Run: ${state.lastRun.timestamp}`);
      }
      break;
      
    case 'report':
      // Force report mode
      orchestrator.run().then(assessment => {
        if (assessment.shouldReport || command === 'report') {
          console.log('\n📋 REPORT MODE — Outputting full report:');
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            healthScore: assessment.healthScore,
            issues: orchestrator.issues,
            fixes: orchestrator.fixes,
            improvements: orchestrator.improvements
          }, null, 2));
        }
      }).catch(console.error);
      break;
      
    case 'run':
    default:
      // Full orchestration cycle
      orchestrator.run().then(assessment => {
        // Exit with appropriate code for external schedulers
        process.exit(assessment.shouldReport ? 1 : 0);
      }).catch(err => {
        console.error('Orchestrator failed:', err);
        process.exit(2);
      });
      break;
  }
}

module.exports = SelfHealingOrchestrator;