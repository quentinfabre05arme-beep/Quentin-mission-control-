/**
 * Self-Audit Logger
 * Tracks autonomous decisions with confidence scoring and cost analysis
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'decisions.jsonl');
const AUDIT_DIR = path.join(__dirname, '..', '..', 'logs', 'audits');

// Ensure directories exist
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * Log an autonomous decision
 */
function logDecision({ action, confidence, cost_tokens = 0, estimated_value = '', should_have_asked = false, reversible = true, undo_command = '', notes = '' }) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    confidence: Math.min(Math.max(confidence, 0), 1),
    cost_tokens,
    cost_eur: calculateCost(cost_tokens),
    estimated_value,
    should_have_asked,
    reversible,
    undo_command,
    notes,
    session_id: process.env.OPENCLAW_SESSION_ID || 'unknown'
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  
  // Log to console for visibility
  const emoji = confidence > 0.9 ? '✅' : confidence > 0.7 ? '⚠️' : '❌';
  console.log(`${emoji} Decision: ${action} (confidence: ${(confidence * 100).toFixed(0)}%, cost: €${entry.cost_eur.toFixed(4)})`);
  
  return entry;
}

/**
 * Calculate estimated cost in EUR
 */
function calculateCost(tokens) {
  // Approximate costs (adjust based on actual pricing)
  const costPer1K = 0.003; // €0.003 per 1K tokens for kimi-k2.6
  return (tokens / 1000) * costPer1K;
}

/**
 * Should this action require asking?
 */
function shouldAskFirst({ confidence, involves_money = false, external_impact = false }) {
  if (involves_money) return true; // Always ask if money involved
  if (confidence < 0.5) return true; // Always ask if uncertain
  if (external_impact && confidence < 0.8) return true; // Ask before external actions if not very confident
  return false;
}

/**
 * Generate weekly audit report
 */
function generateWeeklyAudit() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  if (!fs.existsSync(LOG_FILE)) {
    return 'No decisions logged yet.';
  }
  
  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const decisions = lines.map(line => JSON.parse(line)).filter(d => new Date(d.timestamp) >= weekAgo);
  
  if (decisions.length === 0) {
    return 'No decisions this week.';
  }
  
  const stats = {
    total: decisions.length,
    avgConfidence: decisions.reduce((a, b) => a + b.confidence, 0) / decisions.length,
    totalCost: decisions.reduce((a, b) => a + b.cost_eur, 0),
    shouldHaveAsked: decisions.filter(d => d.should_have_asked).length,
    reversible: decisions.filter(d => d.reversible).length,
    externalActions: decisions.filter(d => d.estimated_value.includes('external') || d.estimated_value.includes('public')).length
  };
  
  const report = `🤖 Weekly Self-Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: ${weekAgo.toDateString()} → ${new Date().toDateString()}
Actions Taken: ${stats.total}
Cost: ${stats.total.toFixed(2)} tokens (€${stats.totalCost.toFixed(4)})
Confidence avg: ${(stats.avgConfidence * 100).toFixed(1)}%
Should have asked: ${stats.shouldHaveAsked} times
Reversible actions: ${stats.reversible}/${stats.total}
External impact: ${stats.externalActions}

Top Decisions:
${decisions.slice(-10).map((d, i) => `${i + 1}. ${d.action} — ${(d.confidence * 100).toFixed(0)}% — ${d.should_have_asked ? '⚠️ Should have asked' : '✅ OK'}`).join('\n')}

${stats.shouldHaveAsked > 0 ? `⚠️ Review needed: ${stats.shouldHaveAsked} decisions flagged` : '✅ All decisions within confidence thresholds'}
`;
  
  const reportFile = path.join(AUDIT_DIR, `audit_${new Date().toISOString().split('T')[0]}.md`);
  fs.writeFileSync(reportFile, report);
  
  return report;
}

/**
 * Check if action involves money
 */
function involvesMoney(action) {
  const moneyKeywords = ['spend', 'purchase', 'buy', 'payment', 'subscription', 'api_key_purchase', 'tool_purchase'];
  return moneyKeywords.some(kw => action.toLowerCase().includes(kw));
}

module.exports = {
  logDecision,
  shouldAskFirst,
  generateWeeklyAudit,
  involvesMoney,
  calculateCost
};
