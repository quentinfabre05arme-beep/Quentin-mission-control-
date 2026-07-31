const fs = require('fs');
const path = require('path');

class SelfImprovementLoop {
    constructor(options = {}) {
        this.logFile = options.logFile || path.join(__dirname, 'self_improvement_log.json');
        this.performanceFile = options.performanceFile || path.join(__dirname, 'performance_metrics.json');
        this.logs = this.loadLogs();
        this.metrics = this.loadMetrics();
    }

    loadLogs() {
        try {
            if (fs.existsSync(this.logFile)) {
                return JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
            }
        } catch (e) {}
        return [];
    }

    loadMetrics() {
        try {
            if (fs.existsSync(this.performanceFile)) {
                return JSON.parse(fs.readFileSync(this.performanceFile, 'utf8'));
            }
        } catch (e) {}
        return {
            tasksCompleted: 0,
            tasksFailed: 0,
            autoRecoveries: 0,
            averageTaskTime: 0,
            lastAnalysis: null
        };
    }

    saveLogs() {
        fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    }

    saveMetrics() {
        fs.writeFileSync(this.performanceFile, JSON.stringify(this.metrics, null, 2));
    }

    recordTaskResult(taskId, success, durationMs, error = null) {
        if (success) {
            this.metrics.tasksCompleted++;
        } else {
            this.metrics.tasksFailed++;
        }
        
        // Update average task time
        const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksFailed;
        this.metrics.averageTaskTime = 
            ((this.metrics.averageTaskTime * (totalTasks - 1)) + durationMs) / totalTasks;
        
        this.saveMetrics();
    }

    analyzePerformance() {
        const analysis = {
            timestamp: new Date().toISOString(),
            successRate: this.metrics.tasksCompleted / (this.metrics.tasksCompleted + this.metrics.tasksFailed) || 0,
            averageTaskTime: this.metrics.averageTaskTime,
            totalTasks: this.metrics.tasksCompleted + this.metrics.tasksFailed,
            suggestions: []
        };

        // Generate suggestions
        if (analysis.successRate < 0.8) {
            analysis.suggestions.push({
                type: 'error_handling',
                priority: 'high',
                description: 'Success rate below 80%. Improve error handling and retry logic.'
            });
        }

        if (this.metrics.averageTaskTime > 300000) { // 5 minutes
            analysis.suggestions.push({
                type: 'performance',
                priority: 'medium',
                description: 'Average task time too high. Consider parallel execution or optimization.'
            });
        }

        if (this.metrics.autoRecoveries > this.metrics.tasksCompleted * 0.3) {
            analysis.suggestions.push({
                type: 'stability',
                priority: 'high',
                description: 'Too many auto-recoveries. Investigate root causes of failures.'
            });
        }

        this.logs.push(analysis);
        if (this.logs.length > 50) this.logs.shift();
        
        this.metrics.lastAnalysis = analysis.timestamp;
        this.saveLogs();
        this.saveMetrics();

        return analysis;
    }

    applyImprovement(suggestion) {
        // Placeholder for actual improvement application
        console.log(`[SelfImprovement] Would apply: ${suggestion.description}`);
        this.log('improvement_applied', suggestion);
    }

    runCycle() {
        const analysis = this.analyzePerformance();
        
        // Auto-apply high priority suggestions if confidence is high
        analysis.suggestions
            .filter(s => s.priority === 'high')
            .forEach(s => this.applyImprovement(s));

        return analysis;
    }
}

module.exports = SelfImprovementLoop;