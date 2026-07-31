// Multi-Model Verification System
// Consults multiple models and compares outputs for critical tasks

const { SmartBrainOrchestrator } = require('./orchestrator.js');

class MultiModelVerifier {
    constructor() {
        this.orchestrator = new SmartBrainOrchestrator();
        this.verificationRules = {
            'research': {
                primary: 'deepseek-v4-pro',
                verifier: 'kimi-k2.6',
                threshold: 0.8
            },
            'coding': {
                primary: 'qwen3-coder',
                verifier: 'kimi-k2.7-code',
                threshold: 0.9
            },
            'analysis': {
                primary: 'kimi-k2.6',
                verifier: 'deepseek-v4-pro',
                threshold: 0.7
            },
            'strategy': {
                primary: 'kimi-k2.6',
                verifier: 'deepseek-v4-pro',
                threshold: 0.8
            }
        };
    }

    async verifyTask(task, category) {
        const rule = this.verificationRules[category];
        if (!rule) {
            // No verification needed — use single model
            return this.orchestrator.executeTask(task);
        }

        console.log(`🔍 Multi-Model Verification: ${category}`);
        console.log(`   Primary: ${rule.primary}`);
        console.log(`   Verifier: ${rule.verifier}`);

        // Execute on both models (simulated)
        const primaryResult = await this.executeWithModel(task, rule.primary);
        const verifyResult = await this.executeWithModel(task, rule.verifier);

        // Compare outputs
        const agreement = this.calculateAgreement(primaryResult, verifyResult);
        
        console.log(`   Agreement: ${(agreement * 100).toFixed(0)}%`);

        if (agreement >= rule.threshold) {
            console.log(`   ✅ Consensus reached`);
            return {
                consensus: true,
                agreement: agreement,
                primaryResult: primaryResult,
                verifyResult: verifyResult,
                recommended: primaryResult
            };
        } else {
            console.log(`   ⚠️ Discrepancy detected`);
            return {
                consensus: false,
                agreement: agreement,
                primaryResult: primaryResult,
                verifyResult: verifyResult,
                recommended: null,
                warning: 'Models disagree — manual review recommended'
            };
        }
    }

    async executeWithModel(task, modelId) {
        // In real implementation, this would call the actual model
        // For now, simulate with orchestrator
        return this.orchestrator.executeTask(task, { modelOverride: modelId });
    }

    calculateAgreement(result1, result2) {
        // Simplified agreement calculation
        // In real implementation, compare actual outputs
        if (result1.analysis.category === result2.analysis.category) {
            return 0.9; // High agreement
        }
        return 0.5; // Low agreement
    }
}

// Export for use
module.exports = { MultiModelVerifier };

// Test
if (require.main === module) {
    const verifier = new MultiModelVerifier();
    
    console.log('═══════════════════════════════════════');
    console.log('  MULTI-MODEL VERIFICATION TEST');
    console.log('═══════════════════════════════════════');
    
    const tests = [
        { task: 'Analyze BTC price trend for next week', category: 'research' },
        { task: 'Write a Python script to calculate Sharpe ratio', category: 'coding' },
        { task: 'Should I buy or sell MSTR?', category: 'strategy' }
    ];
    
    tests.forEach(test => {
        console.log(`\nTest: ${test.task}`);
        const result = verifier.verifyTask(test.task, test.category);
        console.log(`Result: ${result.consensus ? '✅ Consensus' : '⚠️ Discrepancy'}`);
    });
}