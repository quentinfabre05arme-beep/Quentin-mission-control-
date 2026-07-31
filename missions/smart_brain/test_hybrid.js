const SmartBrainOrchestrator = require('./orchestrator');

async function testHybridOrchestration() {
    console.log('🧪 Testing Hybrid Grok + Ollama Orchestration\n');
    
    const brain = new SmartBrainOrchestrator();
    
    const testCases = [
        {
            task: "What is the best AI model for coding in 2026?",
            expected: "grok_fast or primary"
        },
        {
            task: "Write a Python script to fetch crypto prices",
            expected: "coder"
        },
        {
            task: "Analyze the market strategy for Bitcoin in 2026",
            expected: "primary (grok-4.3)"
        },
        {
            task: "Build a dashboard for portfolio tracking",
            expected: "grok_build or coder"
        },
        {
            task: "Calculate the compound annual growth rate for MSTR",
            expected: "analyst"
        }
    ];
    
    for (const test of testCases) {
        console.log(`\n📝 Task: "${test.task}"`);
        const analysis = brain.analyzeTask(test.task);
        const model = brain.selectModel(analysis);
        
        console.log(`   Category: ${analysis.category}`);
        console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
        console.log(`   → Routed: ${model.name} (${model.id})`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   ${model.name.includes('grok') ? '✅ Grok' : '📦 Ollama'}`);
    }
    
    console.log('\n✅ Hybrid orchestration test complete!');
}

testHybridOrchestration().catch(console.error);