/**
 * EXPERIMENT RUNNER — R&D Mode for Alpha Fund
 * Safely test new strategies without risking production
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  EXPERIMENTS_DIR: path.join(__dirname, 'experiments'),
  RESULTS_DIR: path.join(__dirname, 'results'),
  TEST_SIZE: 0.001, // 0.1% of fund for R&D
  MIN_TRADES_FOR_SIGNIFICANCE: 20
};

// Ensure directories exist
[CONFIG.EXPERIMENTS_DIR, CONFIG.RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const EXPERIMENTS = {
  'options-flow': {
    name: 'Options Unusual Activity',
    description: 'Test if unusual options flow predicts price moves',
    dataSource: 'mock_options_data', // Replace with Cheddar Flow API
    baseline: 'standard_asymmetry',
    successMetric: 'hit_rate',
    targetImprovement: 0.15, // 15%
    durationDays: 14
  },
  'sentiment-v2': {
    name: 'Sentiment Analysis NLP V2',
    description: 'Enhanced NLP with entity recognition',
    dataSource: 'twitter_reddit_combined',
    baseline: 'sentiment-v1',
    successMetric: 'hit_rate',
    targetImprovement: 0.08, // 8%
    durationDays: 10
  },
  'on-chain': {
    name: 'Crypto On-Chain Metrics',
    description: 'Exchange flows, holder behavior for crypto',
    dataSource: 'glassnode_api',
    baseline: 'standard_asymmetry',
    successMetric: 'sharpe_ratio',
    targetImprovement: 0.20, // 20%
    durationDays: 21
  }
};

function createExperiment(name) {
  const experiment = EXPERIMENTS[name];
  if (!experiment) {
    console.error(`Unknown experiment: ${name}`);
    console.log(`Available: ${Object.keys(EXPERIMENTS).join(', ')}`);
    return;
  }
  
  const id = `${name}-${Date.now()}`;
  const experimentDir = path.join(CONFIG.EXPERIMENTS_DIR, id);
  fs.mkdirSync(experimentDir, { recursive: true });
  
  const config = {
    id,
    ...experiment,
    status: 'created',
    createdAt: new Date().toISOString(),
    trades: [],
    results: {}
  };
  
  fs.writeFileSync(
    path.join(experimentDir, 'config.json'),
    JSON.stringify(config, null, 2)
  );
  
  console.log(`✅ Experiment created: ${id}`);
  console.log(`   Name: ${experiment.name}`);
  console.log(`   Duration: ${experiment.durationDays} days`);
  console.log(`   Target: ${(experiment.targetImprovement * 100).toFixed(0)}% improvement`);
  
  return id;
}

function runExperiment(id) {
  const experimentDir = path.join(CONFIG.EXPERIMENTS_DIR, id);
  const configPath = path.join(experimentDir, 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`Experiment not found: ${id}`);
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log(`\n🧪 Running Experiment: ${config.name}`);
  console.log('=' .repeat(50));
  
  // Simulate test trades
  const mockTrades = generateMockTrades(config);
  config.trades = mockTrades;
  config.status = 'running';
  config.startedAt = new Date().toISOString();
  
  // Calculate metrics
  const wins = mockTrades.filter(t => t.pnl > 0).length;
  const losses = mockTrades.filter(t => t.pnl < 0).length;
  const hitRate = wins / mockTrades.length;
  const avgWin = mockTrades.filter(t => t.pnl > 0).reduce((a, b) => a + b.pnl, 0) / wins || 0;
  const avgLoss = Math.abs(mockTrades.filter(t => t.pnl < 0).reduce((a, b) => a + b.pnl, 0) / losses) || 0;
  const profitFactor = avgWin / avgLoss || 0;
  
  config.results = {
    totalTrades: mockTrades.length,
    wins,
    losses,
    hitRate,
    avgWin,
    avgLoss,
    profitFactor,
    pnl: mockTrades.reduce((a, b) => a + b.pnl, 0)
  };
  
  // Determine significance
  const isSignificant = mockTrades.length >= CONFIG.MIN_TRADES_FOR_SIGNIFICANCE;
  const hitImprovement = hitRate - 0.55; // Assume 55% baseline
  const isSuccessful = hitImprovement >= config.targetImprovement;
  
  config.results.significance = isSignificant ? 'sufficient' : 'insufficient';
  config.results.recommendation = isSuccessful ? 'promote' : 'drop';
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Display results
  console.log(`\n📊 RESULTS:`);
  console.log(`   Trades: ${config.results.totalTrades}`);
  console.log(`   Hit Rate: ${(hitRate * 100).toFixed(1)}%`);
  console.log(`   Improvement: ${(hitImprovement * 100).toFixed(1)}% vs baseline`);
  console.log(`   Profit Factor: ${profitFactor.toFixed(2)}`);
  console.log(`   Total P&L: $${config.results.pnl.toFixed(2)}`);
  console.log(`   Significance: ${isSignificant ? '✅ Sufficient' : '⚠️ Need more data'}`);
  console.log(`   Recommendation: ${isSuccessful ? '🟢 PROMOTE' : '🔴 DROP'}`);
  
  // Save results
  const resultsPath = path.join(CONFIG.RESULTS_DIR, `${id}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(config, null, 2));
  
  return config;
}

function generateMockTrades(config) {
  const trades = [];
  const numTrades = 25;
  
  // Simulate experiment performance (slightly better than baseline)
  const winRate = 0.55 + (config.targetImprovement * 0.5); // Partial improvement
  
  for (let i = 0; i < numTrades; i++) {
    const isWin = Math.random() < winRate;
    const pnl = isWin 
      ? Math.random() * 100 + 50  // Win $50-150
      : -(Math.random() * 50 + 20); // Lose $20-70
    
    trades.push({
      id: `T${i}`,
      ticker: ['CRWD', 'NVDA', 'PLTR', 'TSLA'][i % 4],
      entry: 100,
      exit: isWin ? 120 : 85,
      pnl: pnl * CONFIG.TEST_SIZE * 10000, // Scale to test size
      timestamp: new Date(Date.now() - i * 86400000).toISOString()
    });
  }
  
  return trades;
}

function listExperiments() {
  const dirs = fs.readdirSync(CONFIG.EXPERIMENTS_DIR)
    .filter(d => fs.statSync(path.join(CONFIG.EXPERIMENTS_DIR, d)).isDirectory());
  
  console.log('\n📋 EXPERIMENTS:');
  
  for (const dir of dirs) {
    const configPath = path.join(CONFIG.EXPERIMENTS_DIR, dir, 'config.json');
    if (!fs.existsSync(configPath)) continue;
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const emoji = config.status === 'created' ? '🔵' : 
                 config.status === 'running' ? '🟡' : 
                 config.results?.recommendation === 'promote' ? '🟢' : '🔴';
    
    console.log(`   ${emoji} ${dir}: ${config.name} (${config.status})`);
    if (config.results?.hitRate) {
      console.log(`      Hit Rate: ${(config.results.hitRate * 100).toFixed(1)}%`);
    }
  }
}

// CLI
const [,, command, arg] = process.argv;

switch (command) {
  case 'create':
    createExperiment(arg);
    break;
  case 'run':
    runExperiment(arg);
    break;
  case 'list':
    listExperiments();
    break;
  default:
    console.log('Usage: node experiment_runner.js [create|run|list] [experiment-name|experiment-id]');
    console.log('\nAvailable experiments:');
    Object.entries(EXPERIMENTS).forEach(([k, v]) => {
      console.log(`   ${k}: ${v.name}`);
    });
}

module.exports = { createExperiment, runExperiment, listExperiments };
