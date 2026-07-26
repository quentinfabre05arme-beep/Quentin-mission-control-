// Smart Brain - Model Router Integration
// Connects smart_brain to ultimate_intelligence router

const UltimateRouter = require('../ultimate_intelligence/router');

class SmartBrainRouter {
  constructor() {
    this.router = new UltimateRouter();
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      savings: 0
    };
  }

  // Process any query through intelligent routing
  async process(query, options = {}) {
    this.stats.totalQueries++;
    
    // Route to optimal model
    const routing = this.router.route(query, options.context);
    
    // Track savings
    if (routing.estimatedCost) {
      // Compare to default model cost (kimi-k2.6 = $0.008/1k)
      const defaultCost = (query.length / 4 / 1000) * 0.008;
      this.stats.savings += Math.max(0, defaultCost - routing.estimatedCost);
    }
    
    return {
      query,
      model: routing.model,
      task: routing.task,
      estimatedCost: routing.estimatedCost,
      config: routing.config,
      status: 'routed'
    };
  }

  // Batch process multiple queries
  async batchProcess(queries) {
    const results = [];
    
    for (const query of queries) {
      const result = await this.process(query);
      results.push(result);
    }
    
    return {
      results,
      summary: {
        total: results.length,
        modelsUsed: [...new Set(results.map(r => r.model))],
        totalEstimatedCost: results.reduce((s, r) => s + (r.estimatedCost || 0), 0)
      }
    };
  }

  // Get routing statistics
  getStats() {
    return {
      ...this.stats,
      averageSavings: this.stats.totalQueries > 0 
        ? (this.stats.savings / this.stats.totalQueries).toFixed(6)
        : 0
    };
  }
}

module.exports = SmartBrainRouter;
