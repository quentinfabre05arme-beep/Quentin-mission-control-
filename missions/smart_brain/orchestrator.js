const fs = require('fs');
const path = require('path');
const SmartRouterV3 = require('./router.v3');

const PERFORMANCE_FILE = path.join(__dirname, '..', '..', 'project_claw_core', 'data', 'smart_brain_performance.json');

// Load config fresh each time
function loadConfig() {
    delete require.cache[require.resolve('./config.json')];
    return require('./config.json');
}

function loadPerformanceLog() {
    if (fs.existsSync(PERFORMANCE_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf8'));
            return Array.isArray(data) ? data : [];
        } catch(e) { return []; }
    }
    return [];
}

function savePerformanceLog(log) {
    fs.mkdirSync(path.dirname(PERFORMANCE_FILE), { recursive: true });
    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(log.slice(-500), null, 2));
}

class SmartBrainOrchestrator {
    constructor(options = {}) {
        this.config = loadConfig();
        this.models = this.config.available_models;
        this.activeTasks = new Map();
        this.performanceLog = loadPerformanceLog();
        this.costOptimization = options.costOptimization !== false;
        this.router = new SmartRouterV3('./config.v3.json');
    }

    // Analyze task and route to best model
    analyzeTask(task) {
        const text = task.toLowerCase();
        let scores = {};
        
        // Initialize scores for all categories
        for (const category of Object.keys(this.config.routing_rules)) {
            scores[category] = 0;
        }

        // Score based on routing rules patterns
        for (const [category, rule] of Object.entries(this.config.routing_rules)) {
            for (const pattern of rule.patterns) {
                // Count occurrences for better scoring
                const regex = new RegExp(pattern, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    scores[category] += matches.length;
                }
            }
        }

        // Determine primary category
        const maxScore = Math.max(...Object.values(scores));
        const category = maxScore > 0 
            ? Object.keys(scores).find(key => scores[key] === maxScore)
            : 'complex_analysis';
        
        // Calculate complexity (1-10)
        const complexity = Math.min(10, Math.ceil(maxScore * 2 + text.length / 100));
        
        // Calculate confidence
        const confidence = maxScore > 0 ? Math.min(1, maxScore / 2) : 0.3;

        return {
            category,
            complexity,
            confidence,
            scores,
            requiresContext: complexity > 5
        };
    }

    // Select best model based on analysis
    selectModel(analysis, task = '') {
        // Use v3 router when available
        if (this.router && task) {
            return this.router.route(task);
        }
        
        const rule = this.config.routing_rules[analysis.category];
        if (rule) {
            const modelKey = rule.model;
            const model = this.models[modelKey];
            
            if (model) {
                // Cost optimization: check if we can use cheaper model
                if (this.costOptimization && rule.fallback) {
                    const confidence = analysis.confidence;
                    const threshold = rule.confidence_threshold || 0.7;
                    
                    if (confidence < threshold) {
                        console.log(`⚡ Confidence ${(confidence * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%, using fallback`);
                        return this.models[rule.fallback] || model;
                    }
                }
                return model;
            }
        }
        
        // Default to main_brain (grok-4.5)
        return this.models.main_brain || this.models.primary;
    }

    // Execute task with selected model
    executeTask(task, options = {}) {
        const analysis = this.analyzeTask(task);
        const model = this.selectModel(analysis, task);
        const executionMode = options.mode || 'single';
        
        console.log(`🧠 Smart Brain v2.0 — Task Analysis`);
        console.log(`   Task: "${task.substring(0, 60)}${task.length > 60 ? '...' : ''}"`);
        console.log(`   Category: ${analysis.category}`);
        console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
        console.log(`   Complexity: ${analysis.complexity}/10`);
        console.log(`   Execution Mode: ${executionMode}`);
        console.log(`   → Routing to: ${model.name} (${model.role})`);
        console.log(`   → Model ID: ${model.id}`);

        // Log performance and persist
        this.performanceLog.push({
            timestamp: new Date().toISOString(),
            task: task.substring(0, 100),
            category: analysis.category,
            model: model.name,
            modelId: model.id,
            confidence: analysis.confidence,
            complexity: analysis.complexity,
            executionMode: executionMode
        });
        savePerformanceLog(this.performanceLog);

        return {
            success: true,
            task: task,
            analysis: analysis,
            assignedModel: model,
            modelId: model.id,
            executionMode: executionMode,
            estimatedTokens: analysis.complexity * 1000
        };
    }

    // Execute with specific model override
    executeWithModel(task, modelId) {
        const model = Object.values(this.models).find(m => m.id === modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found in configuration`);
        }

        console.log(`🎯 Direct model assignment: ${model.name} (${model.id})`);
        
        this.performanceLog.push({
            timestamp: new Date().toISOString(),
            task: task.substring(0, 100),
            category: 'manual_override',
            model: model.name,
            modelId: model.id,
            confidence: 1.0,
            executionMode: 'direct'
        });
        savePerformanceLog(this.performanceLog);

        return {
            success: true,
            task: task,
            assignedModel: model,
            modelId: model.id,
            executionMode: 'direct'
        };
    }

    // Sequential execution: task → validation
    executeSequential(task, validatorModelId = 'safety') {
        const primaryResult = this.executeTask(task, { mode: 'sequential' });
        
        console.log(`\n🔍 Validation phase...`);
        const validator = this.models[validatorModelId] || this.models.safety;
        
        return {
            ...primaryResult,
            validation: {
                validator: validator.name,
                validatorId: validator.id,
                status: 'pending',
                timestamp: new Date().toISOString()
            }
        };
    }

    // Parallel execution: multiple models on same task
    executeParallel(task, modelIds) {
        const results = modelIds.map(id => {
            const model = Object.values(this.models).find(m => m.id === id);
            if (model) {
                return this.executeWithModel(task, id);
            }
            return { error: `Model ${id} not found` };
        });

        return {
            success: true,
            task: task,
            executionMode: 'parallel',
            results: results,
            timestamp: new Date().toISOString()
        };
    }

    // Adaptive execution: escalate if needed
    executeAdaptive(task, maxEscalation = 3) {
        const chain = this.config.execution_modes.adaptive.escalation_chain;
        let currentLevel = 0;
        let result;

        console.log(`🔄 Adaptive execution — Max escalation: ${maxEscalation}`);

        while (currentLevel < Math.min(maxEscalation, chain.length)) {
            const modelKey = chain[currentLevel];
            const model = this.models[modelKey];
            
            console.log(`\n📊 Attempt ${currentLevel + 1}: ${model.name}`);
            
            result = this.executeWithModel(task, model.id);
            
            // In real implementation, would check if result is satisfactory
            // For now, simulate escalation
            if (currentLevel < maxEscalation - 1) {
                console.log(`   Result ambiguous, escalating...`);
            } else {
                console.log(`   Using final model: ${model.name}`);
                break;
            }
            
            currentLevel++;
        }

        return {
            ...result,
            escalationLevel: currentLevel,
            totalAttempts: currentLevel + 1
        };
    }

    // Get performance stats
    getStats() {
        const stats = {
            totalTasks: this.performanceLog.length,
            byModel: {},
            byCategory: {},
            avgConfidence: 0,
            costEstimate: {}
        };

        for (const log of this.performanceLog) {
            // By model
            if (!stats.byModel[log.model]) {
                stats.byModel[log.model] = { count: 0, avgConfidence: 0 };
            }
            stats.byModel[log.model].count++;
            
            // By category
            if (!stats.byCategory[log.category]) {
                stats.byCategory[log.category] = 0;
            }
            stats.byCategory[log.category]++;
        }

        // Calculate averages
        if (this.performanceLog.length > 0) {
            stats.avgConfidence = this.performanceLog.reduce((a, b) => a + b.confidence, 0) / this.performanceLog.length;
        }

        // Estimate costs (rough approximation)
        const costMap = { 'low': 1, 'medium': 2, 'high': 4, 'very_high': 8 };
        for (const log of this.performanceLog) {
            const model = Object.values(this.models).find(m => m.name === log.model);
            if (model) {
                const cost = costMap[model.cost] || 1;
                stats.costEstimate[log.model] = (stats.costEstimate[log.model] || 0) + cost;
            }
        }

        return stats;
    }

    // Export configuration for external use
    exportConfig() {
        return {
            models: this.models,
            routingRules: this.config.routing_rules,
            executionModes: this.config.execution_modes,
            version: this.config.version
        };
    }

    // Get model recommendations for a task
    getRecommendations(task) {
        const analysis = this.analyzeTask(task);
        const primary = this.selectModel(analysis);
        
        const recommendations = [{
            role: 'primary',
            model: primary.name,
            id: primary.id,
            reason: `Best match for ${analysis.category} tasks`,
            confidence: analysis.confidence
        }];

        // Add validation recommendation for complex tasks
        if (analysis.complexity > 5) {
            recommendations.push({
                role: 'validator',
                model: this.models.safety.name,
                id: this.models.safety.id,
                reason: 'Validate output for complex tasks',
                confidence: 0.9
            });
        }

        // Add fallback recommendation
        recommendations.push({
            role: 'fallback',
            model: this.models.primary.name,
            id: this.models.primary.id,
            reason: 'Reliable fallback for any task type',
            confidence: 0.8
        });

        return recommendations;
    }
}

module.exports = SmartBrainOrchestrator;

// CLI usage and testing
if (require.main === module) {
    const brain = new SmartBrainOrchestrator({ costOptimization: true });
    
    console.log("═══════════════════════════════════════════");
    console.log("🧠 SMARTEST BRAIN v2.0 — Multi-Model AI Architecture");
    console.log("═══════════════════════════════════════════\n");
    
    const testTasks = [
        { task: "Write a Python script to fetch Bitcoin prices", mode: 'single' },
        { task: "What's the weather like today?", mode: 'single' },
        { task: "Analyze the impact of GLP-1 drugs on healthcare stocks", mode: 'sequential' },
        { task: "Check system health and report status", mode: 'single' },
        { task: "Debug this JavaScript error: TypeError in line 42", mode: 'single' },
        { task: "Design a microservices architecture for real-time trading", mode: 'single' },
        { task: "Calculate the Sharpe ratio for a portfolio with 15% returns and 20% volatility", mode: 'single' }
    ];

    for (const { task, mode } of testTasks) {
        console.log(`\n📋 Task: "${task}"`);
        console.log("   " + "═".repeat(60));
        
        const result = brain.executeTask(task, { mode });
        
        console.log(`\n   ✅ Routed to: ${result.assignedModel.name}`);
        console.log(`   📊 Category: ${result.analysis.category}`);
        console.log(`   🎯 Confidence: ${(result.analysis.confidence * 100).toFixed(0)}%`);
        console.log(`   🔢 Complexity: ${result.analysis.complexity}/10`);
        console.log(`   ⚡ Execution: ${result.executionMode}`);
        
        if (mode === 'sequential') {
            console.log(`   🔍 Validation: ${result.validation?.validator || 'N/A'}`);
        }
    }

    console.log("\n\n═══════════════════════════════════════════");
    console.log("📊 Performance Statistics");
    console.log("═══════════════════════════════════════════");
    const stats = brain.getStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log("\n\n═══════════════════════════════════════════");
    console.log("🎯 Model Recommendations for: 'Build a trading bot'");
    console.log("═══════════════════════════════════════════");
    const recs = brain.getRecommendations("Build a trading bot");
    recs.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.role.toUpperCase()}: ${rec.model} (${rec.id})`);
        console.log(`   Reason: ${rec.reason}`);
        console.log(`   Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
    });

    console.log("\n✅ Architecture test complete!");
}