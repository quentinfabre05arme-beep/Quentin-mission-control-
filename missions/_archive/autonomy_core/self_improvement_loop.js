/**
 * Autonomy Core v2.0 - Self-Improvement Loop
 * Detect → Analyze → Solve → Verify → Document
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.join(__dirname, 'logs');
const MEMORY_FILE = path.join(process.cwd(), 'MEMORY.md');
const DAILY_LOG_DIR = path.join(process.cwd(), 'memory');

class SelfImprovementLoop {
  constructor() {
    this.attempts = [];
    this.maxAttempts = 5;
    this.ensureDirectories();
  }

  ensureDirectories() {
    [LOG_DIR, DAILY_LOG_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  /**
   * Main loop entry point
   * @param {string} task - Description of the task/problem
   * @param {Function} action - The action to execute
   * @param {Object} context - Additional context
   */
  async execute(task, action, context = {}) {
    const loopId = `loop_${Date.now()}`;
    const startTime = Date.now();
    
    this.log(`🔄 [${loopId}] Starting self-improvement loop`);
    this.log(`📋 Task: ${task}`);

    let result = null;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      this.log(`🎯 Attempt ${attempt}/${this.maxAttempts}`);
      
      try {
        // 1. DETECT - Verify prerequisites
        await this.detectPhase(task, context);
        
        // 2. ANALYZE - Understand the problem
        const analysis = await this.analyzePhase(task, lastError, context);
        
        // 3. SOLVE - Execute with adapted strategy
        result = await this.solvePhase(action, analysis, attempt);
        
        // 4. VERIFY - Confirm success
        const verified = await this.verifyPhase(result, task);
        
        if (verified) {
          // 5. DOCUMENT - Log success
          await this.documentPhase(task, result, attempt, startTime, loopId);
          this.log(`✅ [${loopId}] SUCCESS after ${attempt} attempt(s)`);
          return { success: true, result, attempts: attempt, loopId };
        }
      } catch (error) {
        lastError = error;
        this.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < this.maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts exhausted
    const failure = {
      success: false,
      error: lastError?.message || 'All attempts exhausted',
      attempts: this.maxAttempts,
      loopId,
      task
    };
    
    await this.documentPhase(task, failure, this.maxAttempts, startTime, loopId, true);
    this.log(`💥 [${loopId}] FAILURE after ${this.maxAttempts} attempts`);
    
    return failure;
  }

  async detectPhase(task, context) {
    this.log('🔍 DETECT: Checking prerequisites...');
    // Check system health, dependencies, recent errors
    const recentErrors = this.getRecentErrors(5);
    if (recentErrors.length > 0) {
      this.log(`⚠️ Found ${recentErrors.length} recent errors`);
    }
  }

  async analyzePhase(task, lastError, context) {
    this.log('🧠 ANALYZE: Understanding problem...');
    const analysis = {
      task,
      previousError: lastError?.message,
      timestamp: new Date().toISOString(),
      context
    };
    
    // Pattern matching for known issues
    if (lastError) {
      if (lastError.message?.includes('ECONNREFUSED')) {
        analysis.strategy = 'network_retry';
        analysis.recommendation = 'Check network connectivity, retry with longer delay';
      } else if (lastError.message?.includes('rate limit') || lastError.message?.includes('429')) {
        analysis.strategy = 'rate_limit_backoff';
        analysis.recommendation = 'Implement exponential backoff, reduce request frequency';
      } else if (lastError.message?.includes('timeout')) {
        analysis.strategy = 'timeout_extension';
        analysis.recommendation = 'Increase timeout, check service health';
      } else {
        analysis.strategy = 'generic_retry';
        analysis.recommendation = 'Retry with fresh state';
      }
    }
    
    this.log(`📊 Analysis: ${analysis.strategy || 'fresh_attempt'}`);
    return analysis;
  }

  async solvePhase(action, analysis, attempt) {
    this.log('🔧 SOLVE: Executing action...');
    
    // Adapt action based on analysis
    const adaptedContext = {
      ...analysis,
      attempt,
      retryStrategy: analysis.strategy
    };
    
    const result = await action(adaptedContext);
    return result;
  }

  async verifyPhase(result, task) {
    this.log('✓ VERIFY: Checking result...');
    
    // Basic verification - can be extended
    if (result === null || result === undefined) {
      this.log('⚠️ Result is null/undefined');
      return false;
    }
    
    if (typeof result === 'object' && result.error) {
      this.log('⚠️ Result contains error');
      return false;
    }
    
    this.log('✅ Verification passed');
    return true;
  }

  async documentPhase(task, result, attempts, startTime, loopId, isFailure = false) {
    this.log('📝 DOCUMENT: Logging to MEMORY.md...');
    
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    
    const entry = `
## Autonomy Core v2.0 - Self-Improvement Loop
**Loop ID:** ${loopId}
**Date:** ${timestamp}
**Task:** ${task}
**Status:** ${isFailure ? '❌ FAILED' : '✅ SUCCESS'}
**Attempts:** ${attempts}/${this.maxAttempts}
**Duration:** ${duration}ms
**Strategy:** ${result.strategy || 'N/A'}

**Result:**
${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}

---
`;

    // Append to MEMORY.md
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        fs.appendFileSync(MEMORY_FILE, entry);
      }
    } catch (e) {
      this.log(`⚠️ Could not write to MEMORY.md: ${e.message}`);
    }
    
    // Also log to daily file
    const dailyFile = path.join(DAILY_LOG_DIR, `${date}.md`);
    fs.appendFileSync(dailyFile, entry);
    
    // Log to local log
    const logFile = path.join(LOG_DIR, 'self_improvement.log');
    fs.appendFileSync(logFile, `[${timestamp}] ${loopId}: ${task} - ${isFailure ? 'FAILED' : 'SUCCESS'} (${attempts} attempts, ${duration}ms)\n`);
  }

  getRecentErrors(minutes = 5) {
    const logFile = path.join(LOG_DIR, 'self_improvement.log');
    if (!fs.existsSync(logFile)) return [];
    
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const logs = fs.readFileSync(logFile, 'utf8').split('\n');
    
    return logs.filter(line => line.includes('FAILED') || line.includes('ERROR'));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    const logFile = path.join(LOG_DIR, 'self_improvement.log');
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  }
}

module.exports = SelfImprovementLoop;

// CLI usage
if (require.main === module) {
  const loop = new SelfImprovementLoop();
  
  // Example: Test the loop
  loop.execute(
    'Test self-improvement loop',
    async (context) => {
      console.log('Executing test action with context:', context);
      return { status: 'ok', test: true };
    }
  ).then(result => {
    console.log('Loop result:', result);
  });
}
