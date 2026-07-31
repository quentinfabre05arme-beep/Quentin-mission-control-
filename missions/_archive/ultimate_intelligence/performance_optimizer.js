// Performance Optimizer for Maximum Intelligence
// Caches, preloads, and optimizes model usage

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const PREFETCH_FILE = path.join(__dirname, 'prefetch_models.json');

class PerformanceOptimizer {
  constructor() {
    this.responseCache = new Map();
    this.modelWarmupStatus = new Map();
    this.sessionPool = new Map();
    
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  // Pre-warm models for instant response
  async warmupModels(models = []) {
    console.log('🔥 Pre-warming models...');
    
    for (const model of models) {
      if (!this.modelWarmupStatus.has(model)) {
        // Send minimal query to load model into memory
        this.modelWarmupStatus.set(model, 'warming');
        
        // In real implementation, this would trigger model load
        console.log(`  Warming ${model}...`);
        
        // Mark as ready after simulated warmup
        setTimeout(() => {
          this.modelWarmupStatus.set(model, 'ready');
          console.log(`  ✅ ${model} ready`);
        }, 1000);
      }
    }
  }

  // Smart caching with TTL
  getCached(key) {
    const cacheFile = path.join(CACHE_DIR, this.sanitizeKey(key) + '.json');
    
    try {
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        
        // Check TTL (1 hour for most, 24h for facts)
        const age = Date.now() - data.timestamp;
        const ttl = data.is_fact ? 86400000 : 3600000;
        
        if (age < ttl) {
          return data.response;
        }
      }
    } catch (e) {
      console.error('Cache read error:', e.message);
    }
    
    return null;
  }

  setCache(key, response, isFact = false) {
    const cacheFile = path.join(CACHE_DIR, this.sanitizeKey(key) + '.json');
    
    try {
      fs.writeFileSync(cacheFile, JSON.stringify({
        response,
        timestamp: Date.now(),
        is_fact: isFact
      }));
    } catch (e) {
      console.error('Cache write error:', e.message);
    }
  }

  // Session pooling for parallel execution
  getSession(agentId) {
    if (!this.sessionPool.has(agentId)) {
      this.sessionPool.set(agentId, {
        id: agentId,
        created: Date.now(),
        uses: 0
      });
    }
    
    const session = this.sessionPool.get(agentId);
    session.uses++;
    session.last_used = Date.now();
    
    return session;
  }

  // Batch similar queries
  batchQueries(queries) {
    const batches = new Map();
    
    for (const query of queries) {
      const task = this.detectTask(query);
      if (!batches.has(task)) batches.set(task, []);
      batches.get(task).push(query);
    }
    
    return batches;
  }

  // Predictive prefetching
  async prefetchForContext(context) {
    const predictions = this.predictNeeds(context);
    
    for (const prediction of predictions) {
      if (!this.getCached(prediction)) {
        console.log(`🔮 Prefetching: ${prediction}`);
        // Would trigger background model call
      }
    }
  }

  predictNeeds(context) {
    const predictions = [];
    
    // Predict based on context patterns
    if (context.includes('code')) {
      predictions.push('coding_best_practices');
      predictions.push('language_syntax');
    }
    
    if (context.includes('data')) {
      predictions.push('analysis_methods');
      predictions.push('visualization_options');
    }
    
    return predictions;
  }

  // Optimize token usage
  optimizePrompt(prompt, model) {
    // Remove unnecessary whitespace
    let optimized = prompt.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long for model
    const maxTokens = this.getModelMaxTokens(model);
    if (optimized.length > maxTokens * 4) {
      optimized = optimized.substring(0, maxTokens * 4);
    }
    
    return optimized;
  }

  getModelMaxTokens(model) {
    const limits = {
      'ollama-cloud/qwen3.5:0.8b': 512,
      'ollama-cloud/nomic-embed-text': 512,
      'ollama-cloud/qwen3-vl:8b': 2048,
      'ollama-cloud/gemma4:31b': 4096,
      'ollama-cloud/glm-5.1': 4096,
      'ollama-cloud/deepseek-v4-pro': 4096,
      'ollama-cloud/kimi-k2.6': 4096,
      'ollama-cloud/kimi-k2.7-code': 8192
    };
    
    return limits[model] || 4096;
  }

  // Detect task type
  detectTask(query) {
    const patterns = {
      code: /\b(code|function|script|program|bug|debug|class|api)\b/i,
      analyze: /\b(analyze|research|compare|evaluate|study)\b/i,
      create: /\b(create|write|generate|build|make|design)\b/i,
      question: /\b(what|how|why|when|where|who|explain)\b/i
    };
    
    for (const [task, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) return task;
    }
    
    return 'general';
  }

  sanitizeKey(key) {
    return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  // Performance metrics
  getMetrics() {
    return {
      cache_size: this.responseCache.size,
      sessions: this.sessionPool.size,
      warm_models: Array.from(this.modelWarmupStatus.entries())
        .filter(([_, status]) => status === 'ready')
        .length
    };
  }
}

module.exports = PerformanceOptimizer;
