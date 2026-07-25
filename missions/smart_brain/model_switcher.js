const SmartBrain = require('./orchestrator');

/**
 * Model Switcher — Real-time model switching for OpenClaw
 * 
 * This module provides the actual implementation for switching between
 * different AI models based on task requirements.
 */

class ModelSwitcher {
    constructor() {
        this.brain = new SmartBrain();
        this.currentModel = null;
        this.sessionHistory = [];
    }

    /**
     * Switch to the best model for a given task
     */
    async switchForTask(task, context = {}) {
        const routing = this.brain.executeTask(task);
        const model = routing.assignedModel;
        
        console.log(`🔄 Model Switch: ${this.currentModel?.name || 'none'} → ${model.name}`);
        
        // In a real implementation, this would:
        // 1. Save current session state
        // 2. Initialize new model with context
        // 3. Transfer relevant conversation history
        
        this.currentModel = model;
        this.sessionHistory.push({
            timestamp: new Date().toISOString(),
            task: task.substring(0, 100),
            switchedTo: model.id,
            reason: routing.analysis.category
        });

        return {
            previousModel: this.sessionHistory[this.sessionHistory.length - 2]?.switchedTo || null,
            currentModel: model.id,
            modelName: model.name,
            role: model.role,
            confidence: routing.analysis.confidence,
            context: context
        };
    }

    /**
     * Switch to a specific model by ID
     */
    async switchToModel(modelId, context = {}) {
        const model = Object.values(this.brain.models).find(m => m.id === modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        console.log(`🔄 Direct Switch: ${this.currentModel?.name || 'none'} → ${model.name}`);
        
        this.currentModel = model;
        
        return {
            currentModel: model.id,
            modelName: model.name,
            role: model.role,
            context: context
        };
    }

    /**
     * Get model switch history
     */
    getHistory() {
        return this.sessionHistory;
    }

    /**
     * Recommend model for upcoming task
     */
    recommend(task) {
        return this.brain.getRecommendations(task);
    }

    /**
     * Get current model info
     */
    getCurrentModel() {
        return this.currentModel;
    }
}

// Export for use in other modules
module.exports = ModelSwitcher;

// CLI test
if (require.main === module) {
    const switcher = new ModelSwitcher();
    
    console.log("═══════════════════════════════════════════");
    console.log("🔄 Model Switcher — Real-time Model Switching");
    console.log("═══════════════════════════════════════════\n");
    
    const tasks = [
        "Write a Python script",
        "Analyze market trends",
        "Quick summary needed",
        "Debug this code",
        "Complex mathematical proof"
    ];
    
    (async () => {
        for (const task of tasks) {
            console.log(`\n📋 Task: "${task}"`);
            const result = await switcher.switchForTask(task);
            console.log(`   → Switched to: ${result.modelName} (${result.role})`);
            console.log(`   → Confidence: ${(result.confidence * 100).toFixed(0)}%`);
            console.log("   " + "─".repeat(50));
        }
        
        console.log("\n\n═══════════════════════════════════════════");
        console.log("📜 Switch History");
        console.log("═══════════════════════════════════════════");
        switcher.getHistory().forEach((entry, i) => {
            console.log(`${i + 1}. ${entry.timestamp}`);
            console.log(`   Task: ${entry.task}`);
            console.log(`   Model: ${entry.switchedTo}`);
        });
        
        console.log("\n✅ Model switching test complete!");
    })();
}