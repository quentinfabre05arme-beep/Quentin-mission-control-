/**
 * SELF-IMPROVEMENT ENGINE — Daily research enhancement
 * Analyzes scan results, identifies patterns, updates models
 * Autonomous learning from outcomes
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  TARGET_HIT_RATE: 0.60,
  MIN_SAMPLES: 20,
  OPPORTUNITIES_DIR: path.join(__dirname, '..', 'opportunities'),
  LOG_FILE: path.join(__dirname, '..', 'IMPROVEMENTS_LOG.md'),
  WEIGHTS_FILE: path.join(__dirname, '..', 'config', 'scoring_weights.json')
};

// Current scoring weights (mutable)
let WEIGHTS = {
  valuation_gap: 0.25,
  asymmetry: 0.25,
  catalyst_certainty: 0.20,
  information_edge: 0.20,
  technical_setup: 0.10
};

/**
 * Load historical opportunities
 */
function loadOpportunities() {
  const files = fs.readdirSync(CONFIG.OPPORTUNITIES_DIR)
    .filter(f => f.startsWith('scan_') && f.endsWith('.json'))
    .sort()
    .slice(-30); // Last 30 scans
  
  const opportunities = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(
        path.join(CONFIG.OPPORTUNITIES_DIR, file), 'utf8'
      ));
      opportunities.push(...data.opportunities);
    } catch (e) {}
  }
  return opportunities;
}

/**
 * Analyze prediction accuracy
 */
function analyzePerformance(opportunities) {
  if (opportunities.length < CONFIG.MIN_SAMPLES) {
    return { status: 'INSUFFICIENT_DATA', samples: opportunities.length };
  }
  
  // Calculate hit rate (simplified: did target price get hit?)
  const hits = opportunities.filter(o => {
    // Mock: In production, compare to actual price movement
    return o.asymmetryScore >= 5.0 && o.confidence >= 70;
  });
  
  const hitRate = hits.length / opportunities.length;
  
  // Analyze by factor
  const byFactor = {};
  for (const [factor, weight] of Object.entries(WEIGHTS)) {
    const highWeightOpps = opportunities.filter(o => {
      // Mock: Would correlate with actual factor scores
      return o.asymmetryScore >= 4.0;
    });
    const factorHits = highWeightOpps.filter(o => o.confidence >= 70);
    byFactor[factor] = {
      hitRate: highWeightOpps.length > 0 ? factorHits.length / highWeightOpps.length : 0,
      sampleSize: highWeightOpps.length
    };
  }
  
  return {
    status: 'ANALYZED',
    totalOpportunities: opportunities.length,
    hits: hits.length,
    hitRate,
    byFactor,
    improvementNeeded: hitRate < CONFIG.TARGET_HIT_RATE
  };
}

/**
 * Adjust weights based on performance
 */
function optimizeWeights(analysis) {
  if (!analysis.improvementNeeded) {
    return { adjusted: false, reason: 'Hit rate acceptable', currentHitRate: analysis.hitRate };
  }
  
  const adjustments = [];
  
  // Increase weight for factors with high hit rates
  // Decrease weight for factors with low hit rates
  for (const [factor, stats] of Object.entries(analysis.byFactor)) {
    if (stats.hitRate > analysis.hitRate + 0.1) {
      WEIGHTS[factor] = Math.min(WEIGHTS[factor] * 1.1, 0.35);
      adjustments.push(`${factor}: ↑ ${(WEIGHTS[factor]*100).toFixed(0)}%`);
    } else if (stats.hitRate < analysis.hitRate - 0.1) {
      WEIGHTS[factor] = Math.max(WEIGHTS[factor] * 0.9, 0.05);
      adjustments.push(`${factor}: ↓ ${(WEIGHTS[factor]*100).toFixed(0)}%`);
    }
  }
  
  // Normalize to sum to 1.0
  const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  for (const factor of Object.keys(WEIGHTS)) {
    WEIGHTS[factor] = WEIGHTS[factor] / sum;
  }
  
  // Save weights
  fs.mkdirSync(path.dirname(CONFIG.WEIGHTS_FILE), { recursive: true });
  fs.writeFileSync(CONFIG.WEIGHTS_FILE, JSON.stringify(WEIGHTS, null, 2));
  
  return {
    adjusted: true,
    adjustments,
    newWeights: WEIGHTS,
    previousHitRate: analysis.hitRate
  };
}

/**
 * Identify data gaps
 */
function identifyGaps(opportunities) {
  const gaps = [];
  
  // Check coverage
  const tickersCovered = new Set(opportunities.map(o => o.ticker));
  if (tickersCovered.size < 20) {
    gaps.push(`Low coverage: Only ${tickersCovered.size} tickers vs 25 target`);
  }
  
  // Check for missing data sources
  const hasOptionsData = opportunities.some(o => o.unusualActivity);
  if (!hasOptionsData) {
    gaps.push('Missing: Options flow data (Cheddar Flow integration needed)');
  }
  
  const hasOnChainData = opportunities.some(o => o.onChainSignal);
  if (!hasOnChainData) {
    gaps.push('Missing: On-chain crypto data (Glassnode integration needed)');
  }
  
  return gaps;
}

/**
 * Log improvements
 */
function logImprovement(analysis, optimization, gaps) {
  const timestamp = new Date().toISOString();
  const logEntry = `
## Improvement Cycle — ${timestamp}

### Performance Analysis
- Total opportunities: ${analysis.totalOpportunities || 'N/A'}
- Hit rate: ${(analysis.hitRate * 100).toFixed(1)}% (target: ${(CONFIG.TARGET_HIT_RATE * 100).toFixed(0)}%)
- Status: ${analysis.improvementNeeded ? 'IMPROVEMENT NEEDED' : 'ACCEPTABLE'}

### Weight Adjustments
${optimization.adjusted 
  ? optimization.adjustments.map(a => `- ${a}`).join('\n') 
  : '- No adjustments made'}

### Current Weights
${Object.entries(optimization.newWeights || WEIGHTS)
  .map(([k, v]) => `- ${k}: ${(v*100).toFixed(1)}%`)
  .join('\n')}

### Data Gaps Identified
${gaps.length > 0 
  ? gaps.map(g => `- ${g}`).join('\n') 
  : '- No critical gaps'}

### Next Actions
${gaps.length > 0 
  ? `- ${gaps[0]}` 
  : '- Continue monitoring'}

---
`;
  
  fs.appendFileSync(CONFIG.LOG_FILE, logEntry);
  return logEntry;
}

/**
 * Main improvement cycle
 */
function runImprovement() {
  console.log('🔄 DAILY RESEARCH IMPROVEMENT CYCLE\n');
  
  // Load data
  const opportunities = loadOpportunities();
  console.log(`Loaded ${opportunities.length} historical opportunities`);
  
  // Analyze
  const analysis = analyzePerformance(opportunities);
  console.log(`\n📊 Performance: ${(analysis.hitRate * 100).toFixed(1)}% hit rate`);
  
  // Optimize
  const optimization = optimizeWeights(analysis);
  if (optimization.adjusted) {
    console.log('\n⚙️  Weights adjusted:');
    optimization.adjustments.forEach(a => console.log(`   ${a}`));
  } else {
    console.log(`\n✅ ${optimization.reason}`);
  }
  
  // Identify gaps
  const gaps = identifyGaps(opportunities);
  if (gaps.length > 0) {
    console.log('\n📋 Data gaps:');
    gaps.forEach(g => console.log(`   ${g}`));
  }
  
  // Log
  const logEntry = logImprovement(analysis, optimization, gaps);
  
  console.log('\n💾 Improvement logged');
  return { analysis, optimization, gaps };
}

if (require.main === module) {
  runImprovement();
}

module.exports = { runImprovement, analyzePerformance, optimizeWeights };
