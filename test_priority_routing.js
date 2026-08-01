const config = require('./missions/smart_brain/config.json');

const models = {
  primary: 'grok-4.5',
  deep_reasoner: 'grok-4.3',
  grok_fast: 'grok-4.5',
  grok_build: 'grok-build-0.1',
  coder: 'qwen3-coder',
  fast: 'qwen3',
  analyst: 'deepseek-v4-pro',
  specialist: 'kimi-k2.7-code',
  safety: 'llama3.1',
  ollama_primary: 'kimi-k2.6'
};

// Priority weights for categories (higher = more important)
const categoryPriority = {
  high_stakes: 100,      // Most important - safety first
  strategic: 90,           // Business strategy
  validation: 80,          // Fact checking
  scientific: 70,          // Math/science
  system_design: 60,       // Architecture
  code_tasks: 50,          // Code
  build_tasks: 40,         // Building
  complex_analysis: 30,    // Analysis
  general_intelligence: 20, // General thinking
  quick_queries: 10,       // Simple questions
  trivial: 5              // Single word responses
};

function analyzeTask(task) {
  const text = task.toLowerCase();
  let scores = {};
  let matchDetails = {};
  
  for (const [category, rule] of Object.entries(config.routing_rules)) {
    scores[category] = 0;
    matchDetails[category] = [];
    
    for (const pattern of rule.patterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = text.match(regex);
      if (matches) {
        scores[category] += matches.length;
        matchDetails[category].push(...matches);
      }
    }
    
    // Apply priority weight
    const priority = categoryPriority[category] || 50;
    scores[category] = scores[category] * priority;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  const category = maxScore > 0 ? 
    Object.keys(scores).find(key => scores[key] === maxScore) : 'complex_analysis';
  const confidence = maxScore > 0 ? Math.min(1, maxScore / 100) : 0.3;
  
  return { category, confidence, scores, matchDetails };
}

function selectModel(category, confidence, costOptimized = true) {
  const rule = config.routing_rules[category];
  if (!rule) return models.primary;
  
  const modelKey = rule.model;
  const threshold = rule.confidence_threshold || 0.7;
  
  if (costOptimized && rule.fallback && confidence < threshold) {
    return models[rule.fallback] || models.primary;
  }
  
  return models[modelKey] || models.primary;
}

// COMPREHENSIVE REAL-WORLD TASK TESTS
const tests = [
  { task: 'Write a Python script to fetch Bitcoin prices', expected: 'qwen3-coder', category: 'code' },
  { task: 'Debug this JavaScript error: TypeError in line 42', expected: 'qwen3-coder', category: 'code' },
  { task: 'Build a REST API', expected: 'qwen3-coder', category: 'code' },
  { task: 'Create a function to calculate RSI', expected: 'qwen3-coder', category: 'code' },
  { task: 'Fix the bug in my trading bot', expected: 'qwen3-coder', category: 'code' },
  
  { task: 'Analyze market trends for BTC', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Research quantum computing applications', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Evaluate the performance of my portfolio', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Compare ETH and SOL as investments', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Should I buy MSTR at current prices?', expected: 'kimi-k2.6', category: 'analysis' },
  
  { task: 'Calculate the Sharpe ratio for my portfolio', expected: 'deepseek-v4-pro', category: 'scientific' },
  { task: 'Statistical analysis of price correlations', expected: 'deepseek-v4-pro', category: 'scientific' },
  { task: 'Compute the probability of BTC hitting 100k', expected: 'deepseek-v4-pro', category: 'scientific' },
  
  { task: 'What is the current BTC price?', expected: 'qwen3', category: 'quick' },
  { task: 'Summarize the latest crypto news', expected: 'qwen3', category: 'quick' },
  { task: 'How do I set up a cron job?', expected: 'qwen3', category: 'quick' },
  { task: 'Quick summary of market data', expected: 'qwen3', category: 'quick' },
  
  { task: 'Verify this data is correct', expected: 'llama3.1', category: 'validation' },
  { task: 'Validate my trading strategy', expected: 'llama3.1', category: 'validation' },
  { task: 'Fact check this claim about ETH', expected: 'llama3.1', category: 'validation' },
  
  { task: 'Design a microservices architecture', expected: 'kimi-k2.7-code', category: 'design' },
  { task: 'Architecture for real-time trading system', expected: 'kimi-k2.7-code', category: 'design' },
  
  { task: 'Develop business strategy for Q4', expected: 'grok-4.3', category: 'strategic' },
  { task: 'Create a revenue model for my newsletter', expected: 'grok-4.3', category: 'strategic' },
  { task: 'Market entry strategy for Europe', expected: 'grok-4.3', category: 'strategic' },
  
  { task: 'Make high-stakes investment decision', expected: 'grok-4.5', category: 'high_stakes' },
  { task: 'Critical decision: should I sell all BTC?', expected: 'grok-4.5', category: 'high_stakes' },
  
  { task: 'Think about the best approach to this problem', expected: 'kimi-k2.6', category: 'general' },
  { task: 'Reason through the implications of this trade', expected: 'kimi-k2.6', category: 'general' },
  { task: 'Plan my trading schedule for next week', expected: 'kimi-k2.6', category: 'general' },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('PRIORITY-WEIGHTED MODEL ROUTING TEST — v2.3 Enhanced');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0, failed = 0;
let byCategory = {};
let grokCount = 0;

for (const test of tests) {
  const analysis = analyzeTask(test.task);
  const selected = selectModel(analysis.category, analysis.confidence, true);
  const isGrok = selected.includes('grok');
  
  const match = selected === test.expected;
  if (match) passed++; else failed++;
  if (isGrok) grokCount++;
  
  if (!byCategory[test.category]) {
    byCategory[test.category] = { total: 0, passed: 0, failed: 0 };
  }
  byCategory[test.category].total++;
  if (match) byCategory[test.category].passed++; else byCategory[test.category].failed++;
  
  console.log(`${match ? '✅' : '❌'} [${test.category.toUpperCase()}] ${test.task.substring(0, 45)}...`);
  console.log(`   Expected: ${test.expected} | Got: ${selected} ${isGrok ? '[GROK]' : '[OLLAMA]'}`);
  if (!match) {
    console.log(`   Category matched: ${analysis.category} (score: ${analysis.scores[analysis.category]})`);
    console.log(`   Patterns found: ${analysis.matchDetails[analysis.category].join(', ')}`);
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed}/${tests.length} passed (${((passed/tests.length)*100).toFixed(0)}%)`);
console.log(`Failed: ${failed}`);
console.log(`Grok usage: ${grokCount}/${tests.length} (${(grokCount/tests.length*100).toFixed(0)}%)`);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('BY CATEGORY:');
for (const [cat, stats] of Object.entries(byCategory)) {
  const pct = (stats.passed / stats.total * 100).toFixed(0);
  console.log(`  ${cat.padEnd(12)}: ${stats.passed}/${stats.total} (${pct}%)`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('PRIORITY WEIGHTS APPLIED');
console.log('═══════════════════════════════════════════════════════════════');
for (const [cat, weight] of Object.entries(categoryPriority).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${cat.padEnd(20)}: ${weight}`);
}
