const fs = require('fs');
const path = require('path');

class TokenWatch {
    constructor(options = {}) {
        this.logFile = options.logFile || path.join(__dirname, 'token_usage.json');
        this.dailyLimit = options.dailyLimit || 50000; // tokens
        this.grokDailyLimit = options.grokDailyLimit || 30000;
        
        this.usage = this.loadUsage();
    }

    loadUsage() {
        try {
            if (fs.existsSync(this.logFile)) {
                return JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
            }
        } catch (e) {}
        
        return {
            total: 0,
            grok: 0,
            byModel: {},
            daily: {},
            lastReset: new Date().toISOString().split('T')[0]
        };
    }

    saveUsage() {
        fs.writeFileSync(this.logFile, JSON.stringify(this.usage, null, 2));
    }

    estimateTokens(task, model) {
        // Rough estimation
        const baseLength = task.length / 4; // ~4 chars per token
        
        const multipliers = {
            'grok-4.5': 1.2,
            'grok-4.3': 1.5,
            'qwen3-coder': 1.0,
            'deepseek-v4-pro': 1.3,
            'default': 1.0
        };
        
        const mult = multipliers[model] || multipliers['default'];
        return Math.ceil(baseLength * mult);
    }

    record(task, model, actualTokens = null) {
        const tokens = actualTokens || this.estimateTokens(task, model);
        const today = new Date().toISOString().split('T')[0];
        
        // Reset daily if new day
        if (this.usage.lastReset !== today) {
            this.usage.daily = {};
            this.usage.lastReset = today;
        }
        
        // Update totals
        this.usage.total += tokens;
        if (model.includes('grok')) {
            this.usage.grok += tokens;
        }
        
        // By model
        this.usage.byModel[model] = (this.usage.byModel[model] || 0) + tokens;
        
        // Daily
        this.usage.daily[today] = (this.usage.daily[today] || 0) + tokens;
        
        this.saveUsage();
        
        // Check limits
        const warnings = [];
        if (this.usage.grok > this.grokDailyLimit) {
            warnings.push(`⚠️ Grok daily limit exceeded (${this.usage.grok}/${this.grokDailyLimit})`);
        }
        if (this.usage.total > this.dailyLimit) {
            warnings.push(`⚠️ Total daily limit exceeded (${this.usage.total}/${this.dailyLimit})`);
        }
        
        return { tokens, warnings };
    }

    getStats() {
        return {
            total: this.usage.total,
            grok: this.usage.grok,
            byModel: this.usage.byModel,
            today: this.usage.daily[new Date().toISOString().split('T')[0]] || 0,
            limits: {
                daily: this.dailyLimit,
                grokDaily: this.grokDailyLimit
            }
        };
    }

    reset() {
        this.usage = {
            total: 0,
            grok: 0,
            byModel: {},
            daily: {},
            lastReset: new Date().toISOString().split('T')[0]
        };
        this.saveUsage();
    }
}

module.exports = TokenWatch;