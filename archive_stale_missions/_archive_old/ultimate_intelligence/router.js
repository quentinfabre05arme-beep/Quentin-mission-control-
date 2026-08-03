// Ultimate Intelligence Router
// Routes tasks to optimal models with cost awareness

const MODEL_CONFIGS = {
  // Ultra-fast: Trivial queries (greetings, acknowledgments)
  'ollama-cloud/qwen3.5:0.8b': {
    cost_per_1k: 0.001,
    max_tokens: 512,
    temperature: 0.9,
    timeout: 5000,
    use_for: ['greeting', 'acknowledgment', 'simple_query', 'emoji']
  },
  
  // Fast: Quick factual queries
  'ollama-cloud/gemma4:31b': {
    cost_per_1k: 0.003,
    max_tokens: 1024,
    temperature: 0.7,
    timeout: 10000,
    use_for: ['weather', 'time', 'definition', 'lookup']
  },
  
  // Coder: Programming tasks
  'ollama-cloud/kimi-k2.7-code': {
    cost_per_1k: 0.008,
    max_tokens: 8192,
    temperature: 0.3,
    timeout: 45000,
    use_for: ['code', 'script', 'debug', 'architecture', 'review']
  },
  
  // Analyst: Deep analysis and reasoning
  'ollama-cloud/deepseek-v4-pro': {
    cost_per_1k: 0.006,
    max_tokens: 4096,
    temperature: 0.7,
    timeout: 30000,
    use_for: ['analyze', 'research', 'compare', 'evaluate', 'strategy']
  },
  
  // Agentic: Tool use and agent tasks
  'ollama-cloud/glm-5.1': {
    cost_per_1k: 0.008,
    max_tokens: 4096,
    temperature: 0.5,
    timeout: 30000,
    use_for: ['plan', 'execute', 'tool_use', 'workflow']
  },
  
  // Orchestrator: Complex multi-step reasoning
  'ollama-cloud/kimi-k2.6': {
    cost_per_1k: 0.008,
    max_tokens: 4096,
    temperature: 0.7,
    timeout: 30000,
    use_for: ['orchestrate', 'complex_reasoning', 'multi_step']
  },
  
  // Vision: Image analysis
  'ollama-cloud/qwen3-vl:8b': {
    cost_per_1k: 0.003,
    max_tokens: 2048,
    temperature: 0.5,
    timeout: 25000,
    use_for: ['image', 'vision', 'describe_image', 'ocr']
  },
  
  // Embeddings: Semantic search
  'ollama-cloud/nomic-embed-text': {
    cost_per_1k: 0.0005,
    max_tokens: 512,
    temperature: 0.1,
    timeout: 5000,
    use_for: ['embed', 'search', 'similarity', 'index']
  }
};

// Task detection patterns
const TASK_PATTERNS = {
  greeting: /^(hi|hello|hey|good morning|good evening|howdy)\b/i,
  acknowledgment: /^(ok|okay|thanks|thank you|got it|understood|bye|see ya)\b/i,
  simple_query: /^(what time|what day|how are you|who are you)\b/i,
  weather: /weather|temperature|forecast|rain|snow/i,
  code: /\b(code|function|script|program|bug|error|debug|class|api|database|query)\b/i,
  analyze: /\b(analyze|research|study|compare|evaluate|assess|investigate)\b/i,
  plan: /\b(plan|strategy|design|architecture|workflow|system|implement)\b/i,
  image: /\b(image|picture|photo|screenshot|vision|look at|describe this)\b/i,
  embed: /\b(embedding|semantic|search|similarity|index|vector)\b/i
};

class UltimateRouter {
  constructor() {
    this.budget_daily = 2.67; // $80/month
    this.spent_today = 0;
    this.cache = new Map(); // Simple response cache
  }

  // Route query to optimal model
  route(query, context = {}) {
    // Check cache first
    const cached = this.checkCache(query);
    if (cached) return { model: 'cache', response: cached };

    // Detect task type
    const task = this.detectTask(query);
    
    // Select model based on task and budget
    const model = this.selectModel(task, query.length);
    
    // Track cost
    const estimatedCost = this.estimateCost(query, model);
    
    // Budget check
    if (this.spent_today + estimatedCost > this.budget_daily) {
      return this.fallbackToCheapest(task);
    }
    
    return {
      model,
      task,
      estimatedCost,
      config: MODEL_CONFIGS[model]
    };
  }

  detectTask(query) {
    for (const [task, pattern] of Object.entries(TASK_PATTERNS)) {
      if (pattern.test(query)) return task;
    }
    return 'general';
  }

  selectModel(task, queryLength) {
    // Find models that handle this task
    const candidates = Object.entries(MODEL_CONFIGS)
      .filter(([_, config]) => config.use_for.includes(task))
      .sort((a, b) => a[1].cost_per_1k - b[1].cost_per_1k);
    
    if (candidates.length === 0) {
      // Default to primary model
      return 'ollama-cloud/kimi-k2.6';
    }
    
    // If budget tight, use cheapest candidate
    if (this.spent_today > this.budget_daily * 0.8) {
      return candidates[0][0];
    }
    
    // Otherwise use best (most expensive) candidate
    return candidates[candidates.length - 1][0];
  }

  estimateCost(query, model) {
    const tokens = Math.ceil(query.length / 4);
    const costPer1k = MODEL_CONFIGS[model]?.cost_per_1k || 0.008;
    return (tokens / 1000) * costPer1k;
  }

  fallbackToCheapest(task) {
    const cheapest = Object.entries(MODEL_CONFIGS)
      .sort((a, b) => a[1].cost_per_1k - b[1].cost_per_1k)[0];
    
    return {
      model: cheapest[0],
      task,
      estimatedCost: this.estimateCost('', cheapest[0]),
      config: cheapest[1],
      note: 'Budget fallback - using cheapest model'
    };
  }

  checkCache(query) {
    // Simple exact match cache
    const key = query.toLowerCase().trim();
    return this.cache.get(key);
  }

  addToCache(query, response) {
    const key = query.toLowerCase().trim();
    this.cache.set(key, response);
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
  }

  // Track actual usage
  trackUsage(model, tokens) {
    const cost = (tokens / 1000) * (MODEL_CONFIGS[model]?.cost_per_1k || 0.008);
    this.spent_today += cost;
    return cost;
  }

  // Get budget status
  getBudgetStatus() {
    return {
      daily_budget: this.budget_daily,
      spent: this.spent_today,
      remaining: this.budget_daily - this.spent_today,
      percent_used: (this.spent_today / this.budget_daily * 100).toFixed(1),
      status: this.spent_today > this.budget_daily ? 'over' : 
              this.spent_today > this.budget_daily * 0.8 ? 'warning' : 'ok'
    };
  }
}

module.exports = UltimateRouter;
