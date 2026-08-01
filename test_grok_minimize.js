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

console.log('═══════════════════════════════════════════════════════════════');
console.log('GROK MINIMIZATION VERIFICATION — v2.3');
console.log('═══════════════════════════════════════════════════════════════\n');

const tests = [
  { task: 'Write a Python script to fetch Bitcoin prices', expected: 'qwen3-coder', isGrok: false },
  { task: 'Debug this JavaScript error: TypeError in line 42', expected: 'qwen3-coder', isGrok: false },
  { task: 'Build a REST API', expected: 'qwen3-coder', isGrok: false },
  { task: 'Analyze market trends', expected: 'kimi-k2.6', isGrok: false },
  { task: 'Research quantum computing', expected: 'kimi-k2.6', isGrok: false },
  { task: 'Calculate the Sharpe ratio', expected: 'deepseek-v4-pro', isGrok: false },
  { task: 'Design a microservices architecture', expected: 'kimi-k2.7-code', isGrok: false },
  { task: 'Verify data accuracy', expected: 'llama3.1', isGrok: false },
  { task: 'Confirm these results', expected: 'llama3.1', isGrok: false },
  { task: 'Quick summary please', expected: 'qwen3', isGrok: false },
  { task: 'Develop business strategy for Q4', expected: 'grok-4.3', isGrok: true },
  { task: 'Make high-stakes investment decision', expected: 'grok-4.5', isGrok: true },
];

let passed = 0, failed = 0, grokUsed = 0;

for (const test of tests) {
  const analysis = analyzeTask(test.task);
  const selected = selectModel(analysis.category, analysis.confidence, true);
  const isGrok = selected.includes('grok');
  
  const match = selected === test.expected;
  if (match) passed++; else failed++;
  if (isGrok) grokUsed++;
  
  console.log(`${match ? '✅' : '❌'} ${test.task.substring(0, 40)}...`);
  console.log(`   Category: ${analysis.category} (${(analysis.confidence * 100).toFixed(0)}%)`);
  console.log(`   Expected: ${test.expected} | Got: ${selected} ${isGrok ? '[GROK]' : '[OLLAMA]'}`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed}/${tests.length} passed, ${failed} failed`);
console.log(`Grok usage: ${grokUsed}/${tests.length} tasks (${(grokUsed/tests.length*100).toFixed(0)}%)`);
console.log('═══════════════════════════════════════════════════════════════');

// Verify config changes
console.log('\n📋 CONFIG VERIFICATION:');
console.log(`   quick_queries model: ${config.routing_rules.quick_queries.model} (was: grok_fast)`);
console.log(`   complex_analysis model: ${config.routing_rules.complex_analysis.model} (was: primary)`);
console.log(`   general_intelligence model: ${config.routing_rules.general_intelligence.model} (was: primary)`);
console.log(`   Version: ${config.version}`);
