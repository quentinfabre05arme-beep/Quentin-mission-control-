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

function analyzeTask(task) {
  const text = task.toLowerCase();
  let scores = {};
  
  for (const [category, rule] of Object.entries(config.routing_rules)) {
    scores[category] = 0;
    for (const pattern of rule.patterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = text.match(regex);
      if (matches) scores[category] += matches.length;
    }
  }
  
  const maxScore = Math.max(...Object.values(scores));
  const category = maxScore > 0 ? 
    Object.keys(scores).find(key => scores[key] === maxScore) : 'complex_analysis';
  const confidence = maxScore > 0 ? Math.min(1, maxScore / 2) : 0.3;
  
  return { category, confidence, scores };
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
  // Code tasks (should use qwen3-coder)
  { task: 'Write a Python script to fetch Bitcoin prices', expected: 'qwen3-coder', category: 'code' },
  { task: 'Debug this JavaScript error: TypeError in line 42', expected: 'qwen3-coder', category: 'code' },
  { task: 'Build a REST API', expected: 'qwen3-coder', category: 'code' },
  { task: 'Create a function to calculate RSI', expected: 'qwen3-coder', category: 'code' },
  { task: 'Fix the bug in my trading bot', expected: 'qwen3-coder', category: 'code' },
  
  // Analysis tasks (should use kimi-k2.6)
  { task: 'Analyze market trends for BTC', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Research quantum computing applications', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Evaluate the performance of my portfolio', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Compare ETH and SOL as investments', expected: 'kimi-k2.6', category: 'analysis' },
  { task: 'Should I buy MSTR at current prices?', expected: 'kimi-k2.6', category: 'analysis' },
  
  // Scientific tasks (should use deepseek-v4-pro)
  { task: 'Calculate the Sharpe ratio for my portfolio', expected: 'deepseek-v4-pro', category: 'scientific' },
  { task: 'Statistical analysis of price correlations', expected: 'deepseek-v4-pro', category: 'scientific' },
  { task: 'Compute the probability of BTC hitting 100k', expected: 'deepseek-v4-pro', category: 'scientific' },
  
  // Quick queries (should use qwen3)
  { task: 'What is the current BTC price?', expected: 'qwen3', category: 'quick' },
  { task: 'Summarize the latest crypto news', expected: 'qwen3', category: 'quick' },
  { task: 'How do I set up a cron job?', expected: 'qwen3', category: 'quick' },
  { task: 'Quick summary of market data', expected: 'qwen3', category: 'quick' },
  
  // Validation (should use llama3.1)
  { task: 'Verify this data is correct', expected: 'llama3.1', category: 'validation' },
  { task: 'Validate my trading strategy', expected: 'llama3.1', category: 'validation' },
  { task: 'Fact check this claim about ETH', expected: 'llama3.1', category: 'validation' },
  
  // System design (should use kimi-k2.7-code)
  { task: 'Design a microservices architecture', expected: 'kimi-k2.7-code', category: 'design' },
  { task: 'Architecture for real-time trading system', expected: 'kimi-k2.7-code', category: 'design' },
  
  // Strategic tasks (should use grok-4.3)
  { task: 'Develop business strategy for Q4', expected: 'grok-4.3', category: 'strategic' },
  { task: 'Create a revenue model for my newsletter', expected: 'grok-4.3', category: 'strategic' },
  { task: 'Market entry strategy for Europe', expected: 'grok-4.3', category: 'strategic' },
  
  // High-stakes (should use grok-4.5)
  { task: 'Make high-stakes investment decision', expected: 'grok-4.5', category: 'high_stakes' },
  { task: 'Critical decision: should I sell all BTC?', expected: 'grok-4.5', category: 'high_stakes' },
  
  // General intelligence (should use kimi-k2.6)
  { task: 'Think about the best approach to this problem', expected: 'kimi-k2.6', category: 'general' },
  { task: 'Reason through the implications of this trade', expected: 'kimi-k2.6', category: 'general' },
  { task: 'Plan my trading schedule for next week', expected: 'kimi-k2.6', category: 'general' },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('COMPREHENSIVE MODEL ROUTING TEST — 25 Real-World Tasks');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0, failed = 0;
let byCategory = {};

for (const test of tests) {
  const analysis = analyzeTask(test.task);
  const selected = selectModel(analysis.category, analysis.confidence, true);
  
  const match = selected === test.expected;
  if (match) passed++; else failed++;
  
  if (!byCategory[test.category]) {
    byCategory[test.category] = { total: 0, passed: 0, failed: 0 };
  }
  byCategory[test.category].total++;
  if (match) byCategory[test.category].passed++; else byCategory[test.category].failed++;
  
  const isGrok = selected.includes('grok');
  console.log(`${match ? '✅' : '❌'} [${test.category.toUpperCase()}] ${test.task.substring(0, 45)}...`);
  console.log(`   Expected: ${test.expected} | Got: ${selected} ${isGrok ? '[GROK]' : '[OLLAMA]'}`);
  if (!match) {
    console.log(`   ❌ MISMATCH: routed to ${analysis.category} instead of expected`);
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed}/${tests.length} passed (${((passed/tests.length)*100).toFixed(0)}%)`);
console.log(`Failed: ${failed}`);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('BY CATEGORY:');
for (const [cat, stats] of Object.entries(byCategory)) {
  const pct = (stats.passed / stats.total * 100).toFixed(0);
  console.log(`  ${cat.padEnd(12)}: ${stats.passed}/${stats.total} (${pct}%)`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('GROK USAGE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');

let grokCount = 0;
let ollamaCount = 0;
for (const test of tests) {
  const analysis = analyzeTask(test.task);
  const selected = selectModel(analysis.category, analysis.confidence, true);
  if (selected.includes('grok')) grokCount++; else ollamaCount++;
}

console.log(`Grok tasks:   ${grokCount}/${tests.length} (${(grokCount/tests.length*100).toFixed(0)}%)`);
console.log(`Ollama tasks: ${ollamaCount}/${tests.length} (${(ollamaCount/tests.length*100).toFixed(0)}%)`);
console.log('\nGrok should ONLY be used for:');
console.log('  - Strategic planning (business strategy, revenue model)');
console.log('  - High-stakes decisions (critical, major investment)');
console.log('  - Deep reasoning when Ollama insufficient');
