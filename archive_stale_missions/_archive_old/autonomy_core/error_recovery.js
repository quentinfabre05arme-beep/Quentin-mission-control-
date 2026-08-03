/**
 * Self-Healing Error Recovery v2.0
 * 5-attempt minimum with progressive strategies
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const RECOVERY_LOG = path.join(LOG_DIR, 'recovery.log');
const ERROR_PATTERNS = path.join(__dirname, 'data', 'error_patterns.json');

class ErrorRecovery {
  constructor() {
    this.ensureDirectories();
    this.patterns = this.loadPatterns();
    this.MIN_ATTEMPTS = 5; // Minimum 5 attempts as required
  }

  ensureDirectories() {
    [LOG_DIR, path.join(__dirname, 'data')].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  loadPatterns() {
    const defaultPatterns = {
      network: {
        patterns: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'timeout'],
        strategies: [
          { name: 'retry', delay: 1000, description: 'Simple retry with 1s delay' },
          { name: 'retry_with_backoff', delay: 3000, description: 'Retry with exponential backoff' },
          { name: 'alternative_dns', delay: 5000, description: 'Try alternative DNS' },
          { name: 'circuit_breaker', delay: 10000, description: 'Wait 10s then retry' },
          { name: 'fallback_endpoint', delay: 15000, description: 'Use fallback endpoint' }
        ]
      },
      rate_limit: {
        patterns: ['429', 'rate limit', 'too many requests', 'throttled'],
        strategies: [
          { name: 'backoff', delay: 2000, description: 'Wait 2s before retry' },
          { name: 'extended_backoff', delay: 10000, description: 'Wait 10s' },
          { name: 'reduce_frequency', delay: 30000, description: 'Reduce request frequency' },
          { name: 'api_key_rotation', delay: 5000, description: 'Try alternative API key' },
          { name: 'cache_fallback', delay: 1000, description: 'Use cached data' }
        ]
      },
      auth: {
        patterns: ['401', '403', 'unauthorized', 'forbidden', 'invalid token'],
        strategies: [
          { name: 'token_refresh', delay: 1000, description: 'Refresh authentication token' },
          { name: 'reauth', delay: 3000, description: 'Re-authenticate' },
          { name: 'alternative_key', delay: 2000, description: 'Try alternative API key' },
          { name: 'manual_intervention', delay: 0, description: 'Requires human intervention' },
          { name: 'skip_operation', delay: 0, description: 'Skip operation and continue' }
        ]
      },
      data: {
        patterns: ['parse error', 'invalid json', 'malformed', 'unexpected token'],
        strategies: [
          { name: 'retry_fetch', delay: 2000, description: 'Retry data fetch' },
          { name: 'backup_source', delay: 5000, description: 'Try backup data source' },
          { name: 'manual_parse', delay: 3000, description: 'Manual parsing with cleanup' },
          { name: 'default_values', delay: 0, description: 'Use default/safe values' },
          { name: 'skip_and_log', delay: 0, description: 'Skip and log error' }
        ]
      },
      unknown: {
        patterns: [''],
        strategies: [
          { name: 'retry', delay: 1000, description: 'Simple retry' },
          { name: 'extended_retry', delay: 5000, description: 'Retry after 5s' },
          { name: 'alternative_approach', delay: 10000, description: 'Try alternative approach' },
          { name: 'simplify_request', delay: 3000, description: 'Simplify request' },
          { name: 'human_review', delay: 0, description: 'Escalate to human review' }
        ]
      }
    };

    try {
      if (fs.existsSync(ERROR_PATTERNS)) {
        return { ...defaultPatterns, ...JSON.parse(fs.readFileSync(ERROR_PATTERNS, 'utf8')) };
      }
    } catch (e) {
      console.log('Using default error patterns');
    }

    fs.writeFileSync(ERROR_PATTERNS, JSON.stringify(defaultPatterns, null, 2));
    return defaultPatterns;
  }

  /**
   * Classify error to determine strategy
   */
  classifyError(error) {
    const message = error.message || error.toString();
    const code = error.code || '';
    const statusCode = error.statusCode || error.status || 0;
    
    const fullError = `${message} ${code} ${statusCode}`.toLowerCase();
    
    for (const [category, data] of Object.entries(this.patterns)) {
      if (data.patterns.some(pattern => fullError.includes(pattern.toLowerCase()))) {
        return { category, strategies: data.strategies };
      }
    }
    
    return { category: 'unknown', strategies: this.patterns.unknown.strategies };
  }

  /**
   * Execute recovery with 5-attempt minimum
   */
  async recover(error, operation, context = {}) {
    const recoveryId = `rec_${Date.now()}`;
    const startTime = Date.now();
    
    this.log(`🚨 [${recoveryId}] Error detected: ${error.message}`);
    
    const classification = this.classifyError(error);
    this.log(`📋 Classified as: ${classification.category}`);
    
    const attempts = [];
    let success = false;
    let lastError = error;
    
    // Always attempt at least 5 times as required
    const maxAttempts = Math.max(this.MIN_ATTEMPTS, classification.strategies.length);
    
    for (let i = 0; i < maxAttempts; i++) {
      const strategy = classification.strategies[i] || classification.strategies[classification.strategies.length - 1];
      
      this.log(`🔄 [${recoveryId}] Attempt ${i + 1}/${maxAttempts}: ${strategy.name}`);
      
      try {
        // Wait before retry (except first attempt)
        if (i > 0 && strategy.delay > 0) {
          this.log(`⏳ Waiting ${strategy.delay}ms...`);
          await this.sleep(strategy.delay);
        }
        
        // Execute recovery strategy
        const result = await this.executeStrategy(strategy, operation, context, lastError);
        
        if (result.success) {
          success = true;
          attempts.push({
            attempt: i + 1,
            strategy: strategy.name,
            success: true,
            result: result.data,
            duration: Date.now() - startTime
          });
          
          this.log(`✅ [${recoveryId}] Recovery successful on attempt ${i + 1}`);
          break;
        }
      } catch (e) {
        lastError = e;
        attempts.push({
          attempt: i + 1,
          strategy: strategy.name,
          success: false,
          error: e.message,
          duration: Date.now() - startTime
        });
        
        this.log(`❌ [${recoveryId}] Attempt ${i + 1} failed: ${e.message}`);
      }
    }
    
    const result = {
      recoveryId,
      success,
      attempts: attempts.length,
      total_duration: Date.now() - startTime,
      classification: classification.category,
      strategies_attempted: attempts,
      final_error: success ? null : lastError?.message
    };
    
    // Log to file and MEMORY.md
    this.logRecoveryResult(result);
    this.logToMemory(result);
    
    return result;
  }

  /**
   * Execute a recovery strategy
   */
  async executeStrategy(strategy, operation, context, lastError) {
    switch (strategy.name) {
      case 'retry':
      case 'retry_with_backoff':
      case 'retry_fetch':
      case 'extended_retry':
        return await operation(context);
        
      case 'alternative_dns':
        // Try with different DNS resolution
        context.useAlternativeDNS = true;
        return await operation(context);
        
      case 'backup_source':
      case 'fallback_endpoint':
        // Use alternative data source
        context.useFallback = true;
        return await operation(context);
        
      case 'reduce_frequency':
        // Reduce request rate
        context.throttle = true;
        return await operation(context);
        
      case 'api_key_rotation':
      case 'alternative_key':
        // Rotate API keys
        context.rotateKey = true;
        return await operation(context);
        
      case 'token_refresh':
        // Refresh auth token
        context.refreshToken = true;
        return await operation(context);
        
      case 'reauth':
        // Re-authenticate
        context.reauth = true;
        return await operation(context);
        
      case 'manual_parse':
        // Try manual parsing
        context.manualParse = true;
        return await operation(context);
        
      case 'default_values':
        // Return safe defaults
        return { success: true, data: context.defaults || {} };
        
      case 'cache_fallback':
        // Use cached data
        return { success: true, data: context.cachedData || {}, fromCache: true };
        
      case 'simplify_request':
        // Simplify the request
        context.simplified = true;
        return await operation(context);
        
      case 'alternative_approach':
        // Try completely different approach
        context.alternativeApproach = true;
        return await operation(context);
        
      case 'skip_operation':
      case 'skip_and_log':
        // Skip this operation
        return { success: true, data: null, skipped: true };
        
      case 'circuit_breaker':
        // Wait and retry
        await this.sleep(10000);
        return await operation(context);
        
      case 'manual_intervention':
      case 'human_review':
        // Requires human intervention
        throw new Error('Requires human intervention');
        
      default:
        return await operation(context);
    }
  }

  /**
   * Get recovery statistics
   */
  getStats() {
    const logFile = RECOVERY_LOG;
    if (!fs.existsSync(logFile)) return { total: 0, successful: 0, failed: 0 };
    
    const logs = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
    const successful = logs.filter(l => l.includes('SUCCESS')).length;
    const failed = logs.filter(l => l.includes('FAILURE')).length;
    
    return {
      total: logs.length,
      successful,
      failed,
      success_rate: logs.length > 0 ? ((successful / logs.length) * 100).toFixed(1) : 0
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    console.log(entry.trim());
    fs.appendFileSync(RECOVERY_LOG, entry);
  }

  logRecoveryResult(result) {
    const timestamp = new Date().toISOString();
    const status = result.success ? 'SUCCESS' : 'FAILURE';
    const entry = `[${timestamp}] ${status} | ${result.recoveryId} | ${result.classification} | Attempts: ${result.attempts}/${result.strategies_attempted.length} | Duration: ${result.total_duration}ms\n`;
    fs.appendFileSync(RECOVERY_LOG, entry);
  }

  logToMemory(result) {
    const MEMORY_FILE = path.join(process.cwd(), 'MEMORY.md');
    const entry = `
## Self-Healing Error Recovery
**Recovery ID:** ${result.recoveryId}
**Status:** ${result.success ? '✅ SUCCESS' : '❌ FAILURE'}
**Error Type:** ${result.classification}
**Attempts:** ${result.attempts}
**Duration:** ${result.total_duration}ms

**Strategy Attempts:**
${result.strategies_attempted.map(a => `- ${a.attempt}. ${a.strategy}: ${a.success ? '✅' : '❌'} ${a.error || ''}`).join('\n')}

${result.final_error ? `**Final Error:** ${result.final_error}` : ''}

---
`;

    try {
      if (fs.existsSync(MEMORY_FILE)) {
        fs.appendFileSync(MEMORY_FILE, entry);
      }
    } catch (e) {
      // Silent fail
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ErrorRecovery;

// CLI usage
if (require.main === module) {
  const recovery = new ErrorRecovery();
  
  // Example: Simulate error recovery
  let attemptCount = 0;
  const faultyOperation = async (context) => {
    attemptCount++;
    if (attemptCount < 3) {
      const error = new Error('Simulated network error');
      error.code = 'ECONNREFUSED';
      throw error;
    }
    return { success: true, data: { recovered: true, attempts: attemptCount } };
  };
  
  recovery.recover(
    new Error('Connection refused'),
    faultyOperation,
    { defaults: { safe: true } }
  ).then(result => {
    console.log('\n📊 Recovery Result:', JSON.stringify(result, null, 2));
    console.log('\n📈 Recovery Stats:', recovery.getStats());
  });
}
