const fs = require('fs');
const path = require('path');

class ErrorPatternLearner {
    constructor(options = {}) {
        this.logFile = options.logFile || path.join(__dirname, 'error_patterns.json');
        this.patterns = this.loadPatterns();
    }

    loadPatterns() {
        try {
            if (fs.existsSync(this.logFile)) {
                return JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
            }
        } catch (e) {}
        return {};
    }

    savePatterns() {
        fs.writeFileSync(this.logFile, JSON.stringify(this.patterns, null, 2));
    }

    recordError(errorType, context, actionTaken) {
        if (!this.patterns[errorType]) {
            this.patterns[errorType] = {
                count: 0,
                contexts: [],
                successfulActions: []
            };
        }
        
        this.patterns[errorType].count++;
        this.patterns[errorType].contexts.push({
            timestamp: new Date().toISOString(),
            context
        });
        
        if (actionTaken) {
            this.patterns[errorType].successfulActions.push(actionTaken);
        }
        
        // Keep only last 50 contexts
        if (this.patterns[errorType].contexts.length > 50) {
            this.patterns[errorType].contexts.shift();
        }
        
        this.savePatterns();
    }

    suggestFix(errorType) {
        const pattern = this.patterns[errorType];
        if (!pattern || pattern.successfulActions.length === 0) {
            return null;
        }
        
        // Return most common successful action
        const actionCounts = {};
        pattern.successfulActions.forEach(action => {
            actionCounts[action] = (actionCounts[action] || 0) + 1;
        });
        
        const mostCommon = Object.entries(actionCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        return mostCommon ? mostCommon[0] : null;
    }

    getStats() {
        return Object.keys(this.patterns).map(errorType => ({
            errorType,
            count: this.patterns[errorType].count,
            suggestedFix: this.suggestFix(errorType)
        }));
    }
}

module.exports = ErrorPatternLearner;