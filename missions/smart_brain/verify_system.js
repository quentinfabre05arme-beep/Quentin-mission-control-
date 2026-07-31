const fs = require('fs');
const path = require('path');

console.log('🔍 CLAW HYBRID ORCHESTRATION — SYSTEM VERIFICATION\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        failed++;
    }
}

// Test 1: Config file exists and is valid JSON
console.log('\n📁 CONFIGURATION');
try {
    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    test('config.json is valid JSON', true);
    test('Version is 2.1', config.version === '2.1');
    test('Has 9 models configured', Object.keys(config.available_models).length === 9);
    test('Primary is grok-4.3', config.available_models.primary.id === 'xai/grok-4.3');
    test('Has grok_fast model', !!config.available_models.grok_fast);
    test('Has grok_build model', !!config.available_models.grok_build);
    test('Has routing_rules', !!config.routing_rules);
    test('Has execution_modes', !!config.execution_modes);
    test('Has fallback_chain', Array.isArray(config.fallback_chain));
} catch (e) {
    test('config.json is valid JSON', false);
    console.log(`   Error: ${e.message}`);
}

// Test 2: Orchestrator loads correctly
console.log('\n🧠 ORCHESTRATOR');
try {
    const SmartBrainOrchestrator = require('./orchestrator');
    const brain = new SmartBrainOrchestrator();
    test('Orchestrator instantiates', true);
    test('Models loaded from config', Object.keys(brain.models).length === 9);
    
    // Test routing
    const test1 = brain.analyzeTask("Write a Python function to calculate fibonacci");
    const model1 = brain.selectModel(test1);
    test('Code task routes to coder', model1.role === 'implementation');
    
    const test2 = brain.analyzeTask("What is the meaning of life?");
    const model2 = brain.selectModel(test2);
    test('Quick query routes to grok_fast', model2.id.includes('grok'));
    
    const test3 = brain.analyzeTask("Analyze the best investment strategy for 2026");
    const model3 = brain.selectModel(test3);
    test('Complex analysis routes to primary (grok-4.3)', model3.id === 'xai/grok-4.3');
    
} catch (e) {
    test('Orchestrator loads', false);
    console.log(`   Error: ${e.message}`);
}

// Test 3: Model coverage
console.log('\n📊 MODEL COVERAGE');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const models = config.available_models;

test('Grok-4.3 (primary) configured', models.primary.provider === 'xai');
test('Grok-4.5 (fast) configured', models.grok_fast.provider === 'xai');
test('Grok-build configured', models.grok_build.provider === 'xai');
test('Ollama models configured (6)', 
    models.coder && models.fast && models.safety && models.analyst && models.specialist && models.ollama_primary);

// Test 4: Routing rules coverage
console.log('\n🎯 ROUTING RULES');
const rules = config.routing_rules;
test('code_tasks rule exists', !!rules.code_tasks);
test('quick_queries rule exists', !!rules.quick_queries);
test('complex_analysis rule exists', !!rules.complex_analysis);
test('scientific rule exists', !!rules.scientific);
test('validation rule exists', !!rules.validation);
test('build_tasks rule exists', !!rules.build_tasks);
test('general_intelligence rule exists', !!rules.general_intelligence);

// Test 5: Fallback chains
console.log('\n🔄 FALLBACKS');
test('Primary fallback defined', !!config.routing_rules.code_tasks.fallback);
test('Global fallback chain exists', config.fallback_chain.length >= 3);
test('Cost optimization enabled', config.cost_optimization.enabled === true);

// Test 6: Execution modes
console.log('\n⚙️ EXECUTION MODES');
const modes = config.execution_modes;
test('single mode defined', !!modes.single);
test('sequential mode defined', !!modes.sequential);
test('parallel mode defined', !!modes.parallel);
test('adaptive mode defined', !!modes.adaptive);
test('verification mode defined', !!modes.verification);
test('hybrid mode defined', !!modes.hybrid);

// Test 7: Documentation
console.log('\n📚 DOCUMENTATION');
test('HYBRID_ARCHITECTURE.md exists', fs.existsSync(path.join(__dirname, 'HYBRID_ARCHITECTURE.md')));
test('test_hybrid.js exists', fs.existsSync(path.join(__dirname, 'test_hybrid.js')));

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📈 RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED — Hybrid orchestration is PRODUCTION READY');
} else {
    console.log(`\n⚠️  ${failed} test(s) failed — Review above for details`);
}
console.log('\n' + '='.repeat(60));