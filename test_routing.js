const config = {
  routing_rules: {
    code_tasks: {
      patterns: ['script', 'code', 'program', 'function', 'bug', 'debug', 'implement', 'python', 'javascript', 'java', 'error', 'write a', 'build', 'develop', 'fix', 'api', 'rest', 'backend', 'frontend', 'function to'],
      model: 'coder',
      confidence_threshold: 0.6,
      fallback: 'grok_build'
    },
    complex_analysis: {
      patterns: ['analyze', 'research', 'evaluate', 'compare', 'strategy', 'deep dive', 'comprehensive', 'detailed', 'should i', 'recommend', 'best approach', 'optimal'],
      model: 'primary',
      confidence_threshold: 0.4,
      fallback: 'deep_reasoner'
    },
    quick_queries: {
      patterns: ['what is', 'how to', 'explain', 'summarize', 'quick', 'brief', 'short', 'please', 'tell me about'],
      model: 'grok_fast',
      confidence_threshold: 0.4,
      fallback: 'fast'
    },
    validation: {
      patterns: ['verify', 'validate', 'confirm', 'fact check', 'check if', 'review', 'is this correct'],
      model: 'safety',
      confidence_threshold: 0.5,
      fallback: 'grok_fast'
    },
    system_design: {
      patterns: ['architecture', 'design system', 'microservices', 'scalability', 'performance optimize', 'refactor', 'system design', 'infrastructure'],
      model: 'specialist',
      confidence_threshold: 0.6,
      fallback: 'grok_build'
    },
    scientific: {
      patterns: ['calculate', 'mathematical', 'scientific', 'formula', 'equation', 'statistical', 'regression', 'ratio', 'compute', 'probability'],
      model: 'analyst',
      confidence_threshold: 0.6,
      fallback: 'grok_fast'
    }
  }
};

const models = {
  primary: 'grok-4.5',
  deep_reasoner: 'grok-4.3',
  grok_fast: 'grok-4.5',
  grok_build: 'grok-build-0.1',
  coder: 'qwen3-coder',
  fast: 'qwen3',
  analyst: 'deepseek-v4-pro',
  specialist: 'kimi-k2.7-code',
  safety: 'llama3.1'
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

const tests = [
  { task: 'Write a Python script to fetch Bitcoin prices', expected: 'qwen3-coder' },
  { task: 'Debug this JavaScript error: TypeError in line 42', expected: 'qwen3-coder' },
  { task: 'Build a REST API', expected: 'qwen3-coder' },
  { task: 'Analyze market trends', expected: 'grok-4.5' },
  { task: 'Research quantum computing', expected: 'grok-4.5' },
  { task: 'Calculate the Sharpe ratio', expected: 'deepseek-v4-pro' },
  { task: 'Design a microservices architecture', expected: 'kimi-k2.7-code' },
  { task: 'Verify data accuracy', expected: 'llama3.1' },
  { task: 'Confirm these results', expected: 'llama3.1' },
  { task: 'Quick summary please', expected: 'qwen3' },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('SMART BRAIN ROUTING VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0, failed = 0;

for (const test of tests) {
  const analysis = analyzeTask(test.task);
  const withOpt = selectModel(analysis.category, analysis.confidence, true);
  const withoutOpt = selectModel(analysis.category, analysis.confidence, false);
  
  const match = withOpt === test.expected;
  if (match) passed++; else failed++;
  
  console.log('Task: ' + test.task.substring(0, 45) + '...');
  console.log('  Category: ' + analysis.category + ' (confidence: ' + (analysis.confidence * 100).toFixed(0) + '%)');
  console.log('  Expected: ' + test.expected);
  console.log('  With cost-opt:    ' + withOpt + ' ' + (match ? 'PASS' : 'FAIL'));
  console.log('  Without cost-opt: ' + withoutOpt);
  console.log('');
}

console.log('RESULTS: ' + passed + '/' + tests.length + ' passed, ' + failed + ' failed');
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS OF FAILURES');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Issue 1: grok_fast is an alias to grok-4.5');
console.log('  - quick_queries model = "grok_fast" -> ' + models.grok_fast);
console.log('  - This means quick queries still use Grok, not qwen3');
console.log('');
console.log('Issue 2: Cost optimization aggressively falls back');
console.log('  - When confidence < threshold, uses fallback model');
console.log('  - analyze/research confidence = 50%, threshold = 40%');
console.log('  - 50% > 40% so primary used (correct), but test expected deepseek');
console.log('');
console.log('Issue 3: Research pattern missing from complex_analysis');
console.log('  - "Research quantum computing" matches "research" in patterns');
console.log('  - Should route to primary (grok-4.5), not deepseek');
