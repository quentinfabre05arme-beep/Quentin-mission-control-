const TaskFlow = require('./taskflow');
const SelfHealer = require('./self_healing');
const OOMOLIntegration = require('./oomol_integration');
const ErrorPatternLearner = require('./error_pattern_learner');
const VisibilitySystem = require('./visibility_system');
const SelfImprovementLoop = require('./self_improvement_loop');
const fs = require('fs');
const path = require('path');

class AutonomousEngine {
    constructor(options = {}) {
        this.stateFile = path.join(__dirname, 'engine_state.json');
        this.taskFlow = new TaskFlow();
        this.selfHealer = new SelfHealer();
        this.oomol = new OOMOLIntegration({ apiKey: options.oomolApiKey });
        this.errorLearner = new ErrorPatternLearner();
        this.visibility = new VisibilitySystem();
        this.selfImprovement = new SelfImprovementLoop();
        
        this.isRunning = false;
        this.loadState();
    }

    loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
                if (state.taskFlow) this.taskFlow.queue = state.taskFlow;
            }
        } catch (e) {}
    }

    saveState() {
        try {
            const state = {
                taskFlow: this.taskFlow.queue,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        } catch (e) {}
    }

    log(action, details = {}) {
        this.visibility.log(action, details);
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[AutonomousEngine] Starting unified autonomous system...');

        // Start Self-Healing
        this.selfHealer.start();
        this.log('system_started', { component: 'self_healing' });

        // Start TaskFlow
        this.taskFlow.start();
        this.log('system_started', { component: 'taskflow' });

        // Main loop
        setInterval(async () => {
            await this.runCycle();
        }, 30000); // Every 30 seconds

        this.log('engine_ready', { status: 'running' });
        console.log('[AutonomousEngine] System is now running autonomously.');
    }

    async runCycle() {
        try {
            // Health check
            const health = await this.selfHealer.runHealthCheck();
            if (health.actions.length > 0) {
                this.log('auto_recovery', { actions: health.actions });
            }

            // Self-Improvement analysis (every ~10 cycles)
            if (Math.random() < 0.1) {
                const analysis = this.selfImprovement.runCycle();
                if (analysis.suggestions.length > 0) {
                    this.log('self_improvement', { suggestions: analysis.suggestions });
                }
            }

            // Auto-task generation (proactive behavior)
            this.generateAutoTasks();

            // Check for pending tasks
            const stats = this.taskFlow.getStats();
            if (stats.pending > 0) {
                this.log('tasks_pending', { count: stats.pending });
            }

            // Log periodic status
            if (Math.random() < 0.1) {
                this.log('status_check', this.getStatus());
            }
        } catch (error) {
            this.log('cycle_error', { error: error.message });
            // Continue running even if one cycle fails
        }
    }

    generateAutoTasks() {
        const stats = this.taskFlow.getStats();
        
        // Auto-generate health check task if none pending
        if (stats.pending === 0) {
            this.taskFlow.addTask({
                name: 'System Health Check',
                type: 'health',
                priority: 5,
                action: async () => {
                    return await this.selfHealer.runHealthCheck();
                }
            });
        }

        // Auto-generate self-improvement task periodically
        if (Math.random() < 0.05) {
            this.taskFlow.addTask({
                name: 'Self-Improvement Analysis',
                type: 'improvement',
                priority: 3,
                action: async () => {
                    return this.selfImprovement.runCycle();
                }
            });
        }
    }

    addTask(task) {
        const id = this.taskFlow.addTask(task);
        this.log('task_added', { id, name: task.name, priority: task.priority });
        return id;
    }

    getStatus() {
        return {
            taskflow: this.taskFlow.getStats(),
            visibility: this.visibility.getStats(),
            errorPatterns: this.errorLearner.getStats().length,
            oomolConnections: Object.keys(this.oomol.connections)
        };
    }
}

module.exports = AutonomousEngine;