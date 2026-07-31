// Smart Brain Verification Script v2

// Inline the orchestrator for testing
function loadConfig() {
    return require('./config.json');
}

class SmartBrainOrchestrator {
    constructor(options = {}) {
        this.config = loadConfig();
        this.models = this.config.available_models;
        this.activeTasks = new Map();
        this.performanceLog = [];
        this.costOptimization = options.costOptimization !== false;
    }

    analyzeTask(task) {
        const text = task.toLowerCase();
        let scores = {};
        
        for (const category of Object.keys(this.config.routing_rules)) {
            scores[category] = 0;
        }

        for (const [category, rule] of Object.entries(this.config.routing_rules)) {
            for (const pattern of rule.patterns) {
                const regex = new RegExp(pattern, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    scores[category] += matches.length;
                }
            }
        }

        const maxScore = Math.max(...Object.values(scores));
        const category = maxScore > 0 
            ? Object.keys(scores).find(key => scores[key] === maxScore)
            : 'complex_analysis';
        
        const complexity = Math.min(10, Math.ceil(maxScore * 2 + text.length / 100));
        const confidence = maxScore > 0 ? Math.min(1, maxScore / 2) : 0.3;

        return { category, complexity, confidence, scores, requiresContext: complexity > 5 };
    }

    selectModel(analysis) {
        const rule = this.config.routing_rules[analysis.category];
        if (rule) {
            const modelKey = rule.model;
            const model = this.models[modelKey];
            if (model) {
                if (this.costOptimization && rule.fallback) {
                    const confidence = analysis.confidence;
                    const threshold = rule.confidence_threshold || 0.7;
                    if (confidence < threshold) {
                        console.log(`   ⚡ Confidence ${(confidence * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%, using fallback`);
                        return this.models[rule.fallback] || model;
                    }
                }
                return model;
            }
        }
        return this.models.primary;
    }

    executeTask(task, options = {}) {
        const analysis = this.analyzeTask(task);
        const model = this.selectModel(analysis);
        const executionMode = options.mode || 'single';
        
        this.performanceLog.push({
            timestamp: new Date().toISOString(),
            task: task.substring(0, 100),
            category: analysis.category,
            model: model.name,
            modelId: model.id,
            confidence: analysis.confidence,
            complexity: analysis.complexity
        });

        return {
            success: true,
            task: task,
            analysis: analysis,
            assignedModel: model,
            modelId: model.id,
            executionMode: executionMode
        };
    }
}

// Test cases
const tests = [
    { task: 'Write a Python script to fetch stock prices', expected: 'qwen3-coder' },
    { task: 'Debug this error in my JavaScript', expected: 'qwen3-coder' },
    { task: 'What is the weather today?', expected: 'qwen3' },
    { task: 'Analyze the impact of Fed rates on crypto', expected: 'deepseek-v4-pro' },
    { task: 'Calculate portfolio Sharpe ratio', expected: 'deepseek-v4-pro' },
    { task: 'Design a microservices architecture for trading', expected: 'kimi-k2.7-code' },
    { task: 'Verify this data is correct', expected: 'llama3.1' },
    { task: 'Hello, how are you?', expected: 'kimi-k2.6' }
];

console.log('═══════════════════════════════════════');
console.log('  SMART BRAIN LIVE VERIFICATION');
console.log('═══════════════════════════════════════');
console.log('');

const orchestrator = new SmartBrainOrchestrator();
let passCount = 0;
let failCount = 0;

tests.forEach((test, i) => {
    console.log(`Test ${i+1}: ${test.task}`);
    try {
        const result = orchestrator.executeTask(test.task);
        const actual = result.assignedModel.name;
        const match = (test.expected === actual);
        
        console.log(`   ${match ? '✅' : '⚠️'} Model: ${actual} (expected: ${test.expected})`);
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