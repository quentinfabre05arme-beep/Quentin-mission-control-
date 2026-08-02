/**
 * PROJECT CLAW CORE — Risk Engine
 * Basic risk scoring for actions.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'risk_engine.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class RiskEngine {
  assessAction(action, options = {}) {
    log(`Assessing risk: ${action.type}`);
    let score = 0;
    let reasons = [];
    
    if (action.destructive) { score += 50; reasons.push('destructive'); }
    if (action.irreversible) { score += 30; reasons.push('irreversible'); }
    if (action.network) { score += 10; reasons.push('network'); }
    if (action.spendsMoney) { score += 100; reasons.push('spends_money'); }
    if (action.requiresAuth) { score += 20; reasons.push('requires_auth'); }
    if (action.systemChange) { score += 25; reasons.push('system_change'); }
    
    // Cap at 100
    score = Math.min(100, score);
    
    let level = 'low';
    if (score >= 70) level = 'critical';
    else if (score >= 40) level = 'high';
    else if (score >= 20) level = 'medium';
    
    return {
      score,
      level,
      reasons,
      requires_approval: score >= 40,
      action
    };
  }
  
  approve(risk, userOverride = false) {
    if (risk.action.spendsMoney) return false; // Never approve money without explicit per-transaction consent
    if (risk.level === 'critical' && !userOverride) return false;
    if (risk.level === 'high' && !userOverride) return false;
    return true;
  }
}

module.exports = { RiskEngine };

if (require.main === module) {
  const engine = new RiskEngine();
  console.log(JSON.stringify(engine.assessAction({ type: 'delete_file', destructive: true, irreversible: true }), null, 2));
}
