const fs = require('fs');
const path = require('path');
const TokenWatch = require('./token_watch');

class SmartRouterV3 {
    constructor(configPath = './config.v3.json') {
        this.config = JSON.parse(fs.readFileSync(path.resolve(__dirname, configPath), 'utf8'));
        this.models = this.config.available_models;
        this.decisionLog = [];
        this.tokenWatch = new TokenWatch();
    }

    scoreComplexity(task) {
        const text = task.toLowerCase();
        let score = 0;

        score += Math.min(6, Math.floor(text.length / 50));

        const strategic = ['strategy', 'business', 'revenue', 'market', 'competitive', 'vision', 'scale', 'long term', 'pivot'];
        strategic.forEach(kw => { if (text.includes(kw)) score += 4; });

        const code = ['script', 'code', 'function', 'bug', 'debug', 'python', 'javascript', 'implement', 'fix this'];
        code.forEach(kw => { if (text.includes(kw)) score += 5; });

        const scientific = ['calculate', 'probability', 'statistical', 'regression', 'formula', 'equation', 'math'];
        scientific.forEach(kw => { if (text.includes(kw)) score += 4; });

        if (text.includes('how') || text.includes('why') || text.includes('best')) score += 2;
        if (text.includes('analyze') || text.includes('research') || text.includes('evaluate')) score += 3;

        return Math.min(20, score);
    }

    route(task) {
        const complexity = this.scoreComplexity(task);
        let chosenModel = this.models.main_brain;
        let reason = 'default';

        const lowerTask = task.toLowerCase();

        // Priority 1: Code tasks (strongest signal)
        if (lowerTask.includes('script') || lowerTask.includes('code') || lowerTask.includes('function') || 
            lowerTask.includes('python') || lowerTask.includes('javascript') || lowerTask.includes('implement') ||
            lowerTask.includes('component') || lowerTask.includes('react') || lowerTask.includes('bug') || 
            lowerTask.includes('debug') || lowerTask.includes('fix this') ||
            lowerTask.includes('rest api') || lowerTask.includes('api') || lowerTask.includes('backend')) {
            chosenModel = this.models.code_specialist;
            reason = 'code_task';
        }
        // Priority 2: Strategic / business
        else if (lowerTask.includes('strategy') || lowerTask.includes('business') || lowerTask.includes('revenue') || 
                 lowerTask.includes('market') || lowerTask.includes('competitive') || lowerTask.includes('vision') || 
                 lowerTask.includes('scale') || lowerTask.includes('pivot')) {
            chosenModel = this.models.deep_reasoner;
            reason = 'strategic';
        }
        // Priority 3: Scientific / math
        else if (lowerTask.includes('calculate') || lowerTask.includes('probability') || lowerTask.includes('statistical') || 
                 lowerTask.includes('regression') || lowerTask.includes('formula') || lowerTask.includes('equation')) {
            chosenModel = this.models.deep_analyst;
            reason = 'scientific';
        }
        // Priority 4: Trivial
        else if (lowerTask.length < 40 && (lowerTask.includes('yes') || lowerTask.includes('no') || lowerTask.includes('hi') || 
                 lowerTask.includes('hello') || lowerTask.includes('thanks'))) {
            chosenModel = this.models.ultra_fast;
            reason = 'trivial';
        }
        // Default: Main brain (grok-4.5)
        else {
            chosenModel = this.models.main_brain;
            reason = 'default_intelligence';
        }

        // High complexity escalation (only if not already code/scientific)
        if (complexity >= 17 && !['code_specialist', 'deep_analyst'].includes(chosenModel.role) && reason !== 'code_task') {
            chosenModel = this.models.deep_reasoner;
            reason = 'high_complexity_escalation';
        }

        const decision = {
            timestamp: new Date().toISOString(),
            task: task.substring(0, 80),
            complexity,
            chosen: chosenModel.name,
            model_id: chosenModel.id,
            reason
        };

        this.decisionLog.push(decision);

        // Record token usage
        const tokenResult = this.tokenWatch.record(task, chosenModel.name);
        decision.estimatedTokens = tokenResult.tokens;
        if (tokenResult.warnings.length > 0) {
            console.log(tokenResult.warnings.join('\n'));
        }

        if (this.config.decision_logging.enabled) {
            console.log(`[Router v3] ${chosenModel.name} | ${reason} | complexity=${complexity} | ~${tokenResult.tokens} tokens`);
        }

        return chosenModel;
    }

    getStats() {
        return {
            total_decisions: this.decisionLog.length,
            model_usage: this.decisionLog.reduce((acc, d) => {
                acc[d.chosen] = (acc[d.chosen] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

module.exports = SmartRouterV3;