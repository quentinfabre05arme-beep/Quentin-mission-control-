// Smart Brain Verification Script
const { SmartBrainOrchestrator } = require('./orchestrator.js');

const orchestrator = new SmartBrainOrchestrator();

const tests = [
    'Write a Python script to fetch stock prices',
    'Debug this error in my JavaScript',
    'What is the weather today?',
    'Analyze the impact of Fed rates on crypto',
    'Calculate portfolio Sharpe ratio',
    'Design a microservices architecture for trading',
    'Verify this data is correct',
    'Hello, how are you?'
];

console.log('═══════════════════════════════════════');
console.log('  SMART BRAIN LIVE VERIFICATION');
console.log('═══════════════════════════════════════');
console.log('');

let passCount = 0;
let failCount = 0;

const expectedRoutes = {
    'Write a Python script to fetch stock prices': 'qwen3-coder',
    'Debug this error in my JavaScript': 'qwen3-coder',
    'What is the weather today?': 'qwen3',
    'Analyze the impact of Fed rates on crypto': 'deepseek-v4-pro',
    'Calculate portfolio Sharpe ratio': 'deepseek-v4-pro',
    'Design a microservices architecture for trading': 'kimi-k2.7-code',
    'Verify this data is correct': 'llama3.1',
    'Hello, how are you?': 'kimi-k2.6'
};

tests.forEach((task, i) => {
    console.log(`Test ${i+1}: ${task}`);
    try {
        const result = orchestrator.executeTask(task);
        const expected = expectedRoutes[task];
        const actual = result.assignedModel.name;
        const match = (expected === actual);
        
        console.log(`   ${match ? '✅' : '⚠️'} Model: ${actual} (expected: ${expected})`);
        console.log(`   📊 Category: ${result.analysis.category}`);
        console.log(`   🎯 Confidence: ${(result.analysis.confidence * 100).toFixed(0)}%`);
        console.log(`   🔢 Complexity: ${result.analysis.complexity}/10`);
        
        if (match) passCount++; else failCount++;
    } catch (e) {
        console.log(`   ❌ ERROR: ${e.message}`);
        failCount++;
    }
    console.log('');
});

console.log('═══════════════════════════════════════');
console.log(`  RESULTS: ${passCount} passed, ${failCount} failed`);
console.log(`  Success Rate: ${((passCount/(passCount+failCount))*100).toFixed(0)}%`);
console.log('═══════════════════════════════════════');