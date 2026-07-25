const SmartBrain = require('./orchestrator');
const ModelSwitcher = require('./model_switcher');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     SMARTEST BRAIN v2.0 — COMPREHENSIVE TEST SUITE        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const brain = new SmartBrain();
const switcher = new ModelSwitcher();

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log('✅ PASS:', name);
        passed++;
    } else {
        console.log('❌ FAIL:', name);
        failed++;
    }
}

// TEST SUITE 1: Model Routing
console.log('━━━ TEST SUITE 1: Model Routing ━━━\n');

const tests = [
    { task: 'Write a Python script', expected: 'qwen3-coder', category: 'code' },
    { task: 'Debug this JavaScript error', expected: 'qwen3-coder', category: 'code' },
    { task: 'Build a REST API', expected: 'qwen3-coder', category: 'code' },
    { task: 'Analyze market trends', expected: 'deepseek-v4-pro', category: 'analysis' },
    { task: 'Research quantum computing', expected: 'deepseek-v4-pro', category: 'research' },
    { task: 'Calculate Sharpe ratio', expected: 'deepseek-v4-pro', category: 'math' },
    { task: 'Design microservices', expected: 'kimi-k2.7-code', category: 'design' },
    { task: 'Verify data accuracy', expected: 'llama3.1', category: 'validate' },
    { task: 'Confirm these results', expected: 'llama3.1', category: 'validate' },
    { task: 'Quick summary please', expected: 'qwen3', category: 'quick' }
];

for (const t of tests) {
    const result = brain.executeTask(t.task);
    test(t.category + ': "' + t.task.substring(0, 30) + '..." -> ' + t.expected, 
        result.assignedModel.name === t.expected);
}

// TEST SUITE 2: Execution Modes
console.log('\n━━━ TEST SUITE 2: Execution Modes ━━━\n');

const sequential = brain.executeSequential('Analyze portfolio');
test('Sequential mode returns validation', sequential.validation !== undefined);

const adaptive = brain.executeAdaptive('Complex unknown task');
test('Adaptive mode has escalation', adaptive.escalationLevel !== undefined);

// TEST SUITE 3: Model Switcher
console.log('\n━━━ TEST SUITE 3: Model Switcher ━━━\n');

(async () => {
    const switch1 = await switcher.switchForTask('Write code');
    test('Switcher routes code to qwen3-coder', switch1.modelName === 'qwen3-coder');
    
    const switch2 = await switcher.switchForTask('Analyze data');
    test('Switcher routes analysis to deepseek-v4-pro', switch2.modelName === 'deepseek-v4-pro');
    
    const history = switcher.getHistory();
    test('History tracks switches', history.length >= 2);
    
    const current = switcher.getCurrentModel();
    test('Current model tracked', current !== null);

    // TEST SUITE 4: Recommendations
    console.log('\n━━━ TEST SUITE 4: Recommendations ━━━\n');
    
    const recs = brain.getRecommendations('Build trading bot');
    test('Returns recommendations', recs.length > 0);
    test('Has primary recommendation', recs.some(r => r.role === 'primary'));
    test('Has fallback recommendation', recs.some(r => r.role === 'fallback'));

    // TEST SUITE 5: Performance Stats
    console.log('\n━━━ TEST SUITE 5: Performance Stats ━━━\n');
    
    const stats = brain.getStats();
    test('Stats tracked', stats.totalTasks > 0);
    test('By-model breakdown', Object.keys(stats.byModel).length > 0);
    test('Cost estimates', Object.keys(stats.costEstimate).length > 0);

    // FINAL SUMMARY
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST SUMMARY                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Total Tests: ' + (passed + failed));
    console.log('║  Passed: ' + passed + ' ✅');
    console.log('║  Failed: ' + failed + (failed > 0 ? ' ❌' : ''));
    console.log('║  Success Rate: ' + ((passed / (passed + failed)) * 100).toFixed(1) + '%');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! Architecture is fully operational.\n');
    }
})();