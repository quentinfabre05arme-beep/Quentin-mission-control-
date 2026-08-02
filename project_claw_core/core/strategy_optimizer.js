/**
 * PROJECT CLAW CORE — Strategy Optimizer
 * Pick best action based on expected utility.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'strategy_optimizer.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class StrategyOptimizer {
  optimize(strategies, context) {
    log(`Optimizing ${strategies.length} strategies`);
    let best = null;
    let bestScore = -Infinity;
    
    for (const s of strategies) {
      const score = this.score(s, context);
      if (score > bestScore) {
        bestScore = score;
        best = { ...s, score };
      }
    }
    
    return { success: true, best, alternatives: strategies.filter(s => s.name !== best.name).map(s => ({ ...s, score: this.score(s, context) })).sort((a, b) => b.score - a.score) };
  }
  
  score(strategy, context) {
    let score = strategy.baseScore || 0;
    if (context.ram > 90 && strategy.ramImpact < 0) score += 10;
    if (context.disk < 10 && strategy.freesDisk) score += 10;
    if (strategy.cost && context.budget < strategy.cost) score -= 50;
    if (strategy.risk === 'low') score += 5;
    if (strategy.risk === 'high') score -= 10;
    return score;
  }
}

module.exports = { StrategyOptimizer };

if (require.main === module) {
  const optimizer = new StrategyOptimizer();
  const strategies = [
    { name: 'ram_cleanup', baseScore: 5, ramImpact: -20, risk: 'low' },
    { name: 'market_scan', baseScore: 8, cost: 5, risk: 'medium' },
    { name: 'deploy', baseScore: 6, risk: 'high' }
  ];
  const result = optimizer.optimize(strategies, { ram: 92, budget: 10 });
  console.log(JSON.stringify(result, null, 2));
}
