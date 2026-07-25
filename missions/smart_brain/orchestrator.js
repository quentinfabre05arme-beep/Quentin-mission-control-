const config = require('./config.json');

class SmartBrainOrchestrator {
  constructor() {
    this.config = config;
    this.models = config.models;
    this.activeTasks = new Map();
    this.performanceLog = [];
  }

  // Analyze task and route to best model
  async analyzeAndRoute(task) {
    return this.analyzeAndRouteSync(task);
  }

  // Analyze task complexity and type
  analyzeTask(task) {
    const text = task.toLowerCase();
    let scores = {
      code: 0,
      quick: 0,
      complex: 0,
      monitoring: 0,
      validation: 0
    };

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
  selectModel(analysis) {
    const rule = this.config.routing_rules[analysis.category];
    if (rule) {
      const modelKey = rule.model;
      return this.models[modelKey] || this.models.primary;
    }
    return this.models.primary;
  }

  // Execute task with selected model
  executeTask(task, context = {}) {
    const routing = this.analyzeAndRouteSync(task);
    const model = routing.assignedModel;
    
    console.log(`🧠 Routing to ${model.name} (${model.role})`);
    console.log(`   Confidence: ${(routing.confidence * 100).toFixed(0)}%`);
    console.log(`   Complexity: ${routing.estimatedTokens} tokens est.`);

    // Log performance
    this.performanceLog.push({
      timestamp: new Date().toISOString(),
      task: task.substring(0, 100),
      model: model.name,
      confidence: routing.confidence
    });

    return {
      success: true,
      model: model.id,
      routing: routing,
      context: context
    };
  }

  // Synchronous version for testing
  analyzeAndRouteSync(task) {
    const analysis = this.analyzeTask(task);
    const bestModel = this.selectModel(analysis);
    
    return {
      task: task,
      analysis: analysis,
      assignedModel: bestModel,
      confidence: analysis.confidence,
      estimatedTokens: analysis.complexity * 1000
    };
  }

  // Get performance stats
  getStats() {
    const stats = {
      totalTasks: this.performanceLog.length,
      byModel: {},
      avgConfidence: 0
    };

    for (const log of this.performanceLog) {
      if (!stats.byModel[log.model]) {
        stats.byModel[log.model] = 0;
      }
      stats.byModel[log.model]++;
    }

    if (this.performanceLog.length > 0) {
      stats.avgConfidence = this.performanceLog.reduce((a, b) => a + b.confidence, 0) / this.performanceLog.length;
    }

    return stats;
  }

  // Validate output with safety model
  async validateOutput(output, originalTask) {
    const safetyModel = this.models.safety;
    console.log(`🔍 Validating with ${safetyModel.name}...`);
    
    // In real implementation, this would call the safety model
    return {
      valid: true,
      checkedBy: safetyModel.id,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SmartBrainOrchestrator;

// CLI usage
if (require.main === module) {
  const brain = new SmartBrainOrchestrator();
  
  const testTasks = [
    "Write a Python script to fetch Bitcoin prices",
    "What's the weather like today?",
    "Analyze the impact of GLP-1 drugs on healthcare stocks",
    "Check system health and report status",
    "Debug this JavaScript error: TypeError in line 42"
  ];

  console.log("🧠 Smartest Brain - Multi-Model Architecture\n");
  
  for (const task of testTasks) {
    console.log(`\n📋 Task: "${task}"`);
    const result = brain.executeTask(task);
    console.log(`   → Routed to: ${result.routing.assignedModel.name}`);
    console.log(`   → Model ID: ${result.model}`);
    console.log("   ─────────────────────────────");
  }

  console.log("\n📊 Performance Stats:");
  console.log(JSON.stringify(brain.getStats(), null, 2));
}