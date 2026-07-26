// Ollama Cloud Optimization Script
// Implements intelligent model routing and cost tracking

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'openclaw.json');
const USAGE_LOG = path.join(__dirname, 'ollama_usage.json');

// Model routing rules
const ROUTING_RULES = [
  {
    pattern: /\b(code|program|script|debug|function|class|api)\b/i,
    model: 'ollama-cloud/kimi-k2.7-code',
    confidence: 0.95,
    name: 'coder'
  },
  {
    pattern: /\b(analyze|research|compare|study|evaluate|assess)\b/i,
    model: 'ollama-cloud/deepseek-v4-pro',
    confidence: 0.85,
    name: 'analyst'
  },
  {
    pattern: /\b(hello|hi|hey|thanks|ok|yes|no|bye)\b/i,
    model: 'ollama-cloud/gemma4:31b',
    confidence: 1.0,
    name: 'fast'
  },
  {
    pattern: /\b(cron|schedule|monitor|health|cleanup|maintenance)\b/i,
    model: 'ollama-cloud/qwen3.5:397b',
    confidence: 0.9,
    name: 'background'
  },
  {
    pattern: /\b(plan|strategy|design|architecture|system)\b/i,
    model: 'ollama-cloud/kimi-k2.6',
    confidence: 0.8,
    name: 'orchestrator'
  }
];

// Cost per 1K tokens (estimated)
const MODEL_COSTS = {
  'ollama-cloud/kimi-k2.6': 0.008,
  'ollama-cloud/kimi-k2.7-code': 0.008,
  'ollama-cloud/deepseek-v4-pro': 0.006,
  'ollama-cloud/glm-5.2:cloud': 0.006,
  'ollama-cloud/qwen3.5:397b': 0.003,
  'ollama-cloud/gemma4:31b': 0.001
};

class OllamaOptimizer {
  constructor() {
    this.usage = this.loadUsage();
  }

  loadUsage() {
    try {
      return JSON.parse(fs.readFileSync(USAGE_LOG, 'utf8'));
    } catch {
      return {
        totalTokens: 0,
        totalCost: 0,
        byModel: {},
        byTask: {},
        daily: {}
      };
    }
  }

  saveUsage() {
    fs.writeFileSync(USAGE_LOG, JSON.stringify(this.usage, null, 2));
  }

  // Route query to best model
  routeQuery(query, context = {}) {
    const normalized = query.toLowerCase().trim();
    
    // Check routing rules
    for (const rule of ROUTING_RULES) {
      if (rule.pattern.test(normalized)) {
        return {
          model: rule.model,
          confidence: rule.confidence,
          reason: rule.name,
          estimatedCost: this.estimateCost(normalized, rule.model)
        };
      }
    }

    // Default to primary model
    return {
      model: 'ollama-cloud/kimi-k2.6',
      confidence: 0.5,
      reason: 'default',
      estimatedCost: this.estimateCost(normalized, 'ollama-cloud/kimi-k2.6')
    };
  }

  // Estimate cost for query
  estimateCost(query, model) {
    const tokens = Math.ceil(query.length / 4); // Rough estimate
    const costPer1K = MODEL_COSTS[model] || 0.008;
    return (tokens / 1000) * costPer1K;
  }

  // Log token usage
  logUsage(model, tokens, task = 'unknown') {
    const cost = (tokens / 1000) * (MODEL_COSTS[model] || 0.008);
    const today = new Date().toISOString().split('T')[0];

    this.usage.totalTokens += tokens;
    this.usage.totalCost += cost;

    // By model
    if (!this.usage.byModel[model]) {
      this.usage.byModel[model] = { tokens: 0, cost: 0, calls: 0 };
    }
    this.usage.byModel[model].tokens += tokens;
    this.usage.byModel[model].cost += cost;
    this.usage.byModel[model].calls += 1;

    // By task
    if (!this.usage.byTask[task]) {
      this.usage.byTask[task] = { tokens: 0, cost: 0 };
    }
    this.usage.byTask[task].tokens += tokens;
    this.usage.byTask[task].cost += cost;

    // Daily
    if (!this.usage.daily[today]) {
      this.usage.daily[today] = { tokens: 0, cost: 0 };
    }
    this.usage.daily[today].tokens += tokens;
    this.usage.daily[today].cost += cost;

    this.saveUsage();
  }

  // Get optimization report
  getReport() {
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = this.usage.daily[today] || { tokens: 0, cost: 0 };
    
    // Calculate potential savings
    let currentCost = 0;
    let optimizedCost = 0;

    for (const [task, data] of Object.entries(this.usage.byTask)) {
      currentCost += data.cost;
      // If using fast model for simple tasks, cost is ~30% of current
      if (['greeting', 'acknowledgment', 'simple_query'].includes(task)) {
        optimizedCost += data.cost * 0.3;
      } else {
        optimizedCost += data.cost;
      }
    }

    const savings = currentCost - optimizedCost;
    const savingsPercent = currentCost > 0 ? (savings / currentCost * 100).toFixed(1) : 0;

    return {
      totalTokens: this.usage.totalTokens,
      totalCost: this.usage.totalCost.toFixed(4),
      dailyTokens: dailyUsage.tokens,
      dailyCost: dailyUsage.cost.toFixed(4),
      byModel: this.usage.byModel,
      potentialSavings: savings.toFixed(4),
      savingsPercent: `${savingsPercent}%`,
      budgetStatus: dailyUsage.cost > 2.67 ? '⚠️ Over daily budget' : '✅ Within budget',
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recs = [];
    
    // Check if using expensive models for simple tasks
    const fastModelUsage = this.usage.byModel['ollama-cloud/gemma4:31b']?.calls || 0;
    const totalCalls = Object.values(this.usage.byModel).reduce((s, m) => s + (m.calls || 0), 0);
    
    if (totalCalls > 0 && (fastModelUsage / totalCalls) < 0.2) {
      recs.push('Route more simple queries to fast model (gemma4:31b)');
    }

    // Check daily budget
    const today = new Date().toISOString().split('T')[0];
    const dailyCost = this.usage.daily[today]?.cost || 0;
    const monthlyBudget = 80;
    const dailyBudget = monthlyBudget / 30;
    
    if (dailyCost > dailyBudget) {
      recs.push(`Daily spend ($${dailyCost.toFixed(2)}) exceeds budget ($${dailyBudget.toFixed(2)})`);
    }

    // Check model distribution
    if (Object.keys(this.usage.byModel).length < 3) {
      recs.push('Consider using more model variety for cost optimization');
    }

    return recs;
  }

  // Optimize cron jobs
  optimizeCronJobs() {
    // Read current cron config
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      
      // Update cron jobs to use lightweight models
      if (config.cron) {
        for (const job of Object.values(config.cron)) {
          if (job.model && job.model.includes('kimi-k2.6')) {
            job.model = 'ollama-cloud/qwen3.5:397b';
            console.log(`Updated cron job ${job.name} to use lightweight model`);
          }
        }
      }

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      return { success: true, message: 'Cron jobs optimized' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

// CLI
if (require.main === module) {
  const optimizer = new OllamaOptimizer();
  const command = process.argv[2];

  switch (command) {
    case 'route':
      const query = process.argv[3] || 'Hello, how are you?';
      console.log(JSON.stringify(optimizer.routeQuery(query), null, 2));
      break;
    case 'report':
      console.log(JSON.stringify(optimizer.getReport(), null, 2));
      break;
    case 'optimize-cron':
      console.log(JSON.stringify(optimizer.optimizeCronJobs(), null, 2));
      break;
    default:
      console.log('Usage: node OLLAMA_OPTIMIZATION.js {route|report|optimize-cron}');
      console.log('\nExamples:');
      console.log('  node OLLAMA_OPTIMIZATION.js route "Write a function"');
      console.log('  node OLLAMA_OPTIMIZATION.js report');
      console.log('  node OLLAMA_OPTIMIZATION.js optimize-cron');
  }
}

module.exports = OllamaOptimizer;
