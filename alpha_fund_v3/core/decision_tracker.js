/**
 * 📊 DECISION OUTCOME TRACKER
 * Tracks every decision and its result to learn from mistakes
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const DECISIONS_FILE = path.join(LOG_DIR, 'decisions.jsonl');
const OUTCOMES_FILE = path.join(LOG_DIR, 'outcomes.jsonl');
const ACCURACY_FILE = path.join(LOG_DIR, 'accuracy.json');

// ─── LOG DECISION ───────────────────────────────────────────
function logDecision(action, ticker, reasoning, context = {}) {
  const decision = {
    id: Date.now().toString(36),
    timestamp: new Date().toISOString(),
    action,
    ticker,
    reasoning,
    context,
    status: 'pending'
  };
  
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(DECISIONS_FILE, JSON.stringify(decision) + '\n');
  
  return decision.id;
}

// ─── UPDATE OUTCOME ─────────────────────────────────────────
function updateOutcome(decisionId, outcome) {
  // Read all decisions
  if (!fs.existsSync(DECISIONS_FILE)) return false;
  
  const lines = fs.readFileSync(DECISIONS_FILE, 'utf8').split('\n').filter(l => l.trim());
  const decisions = lines.map(l => JSON.parse(l));
  
  // Find and update
  const decision = decisions.find(d => d.id === decisionId);
  if (!decision) return false;
  
  decision.status = 'completed';
  decision.outcome = outcome;
  decision.outcome_timestamp = new Date().toISOString();
  
  // Calculate if decision was correct
  let correct = null;
  if (decision.action === 'BUY' && outcome.pnl_pct > 0) correct = true;
  else if (decision.action === 'BUY' && outcome.pnl_pct < 0) correct = false;
  else if (decision.action === 'SELL' && outcome.pnl_pct < 0) correct = true;
  else if (decision.action === 'SELL' && outcome.pnl_pct > 0) correct = false;
  else if (decision.action === 'HOLD') correct = Math.abs(outcome.pnl_pct) < 5; // Hold is correct if price didn't move much
  
  decision.correct = correct;
  
  // Write back
  fs.writeFileSync(DECISIONS_FILE, decisions.map(d => JSON.stringify(d)).join('\n') + '\n');
  
  // Log outcome
  fs.appendFileSync(OUTCOMES_FILE, JSON.stringify({
    decision_id: decisionId,
    ticker: decision.ticker,
    action: decision.action,
    pnl_pct: outcome.pnl_pct,
    correct,
    timestamp: decision.outcome_timestamp
  }) + '\n');
  
  // Update accuracy
  updateAccuracy();
  
  return true;
}

// ─── CALCULATE ACCURACY ─────────────────────────────────────
function updateAccuracy() {
  if (!fs.existsSync(DECISIONS_FILE)) return null;
  
  const lines = fs.readFileSync(DECISIONS_FILE, 'utf8').split('\n').filter(l => l.trim());
  const decisions = lines.map(l => JSON.parse(l));
  
  const completed = decisions.filter(d => d.status === 'completed' && d.correct !== null);
  const correct = completed.filter(d => d.correct === true).length;
  const total = completed.length;
  
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  // By ticker
  const byTicker = {};
  completed.forEach(d => {
    if (!byTicker[d.ticker]) byTicker[d.ticker] = { total: 0, correct: 0 };
    byTicker[d.ticker].total++;
    if (d.correct) byTicker[d.ticker].correct++;
  });
  
  const accuracyByTicker = {};
  Object.entries(byTicker).forEach(([t, v]) => {
    accuracyByTicker[t] = {
      accuracy: Math.round((v.correct / v.total) * 100),
      total: v.total
    };
  });
  
  const result = {
    timestamp: new Date().toISOString(),
    overall_accuracy: accuracy,
    total_decisions: total,
    correct: correct,
    wrong: total - correct,
    by_ticker: accuracyByTicker
  };
  
  fs.writeFileSync(ACCURACY_FILE, JSON.stringify(result, null, 2));
  
  return result;
}

// ─── GET ACCURACY ───────────────────────────────────────────
function getAccuracy() {
  if (!fs.existsSync(ACCURACY_FILE)) return null;
  return JSON.parse(fs.readFileSync(ACCURACY_FILE, 'utf8'));
}

// ─── SIMULATE OUTCOME (for testing) ─────────────────────────
function simulateOutcome(decisionId, daysLater = 7) {
  const decisions = fs.readFileSync(DECISIONS_FILE, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  const decision = decisions.find(d => d.id === decisionId);
  
  if (!decision) return null;
  
  // Simulate: random P&L between -10% and +20%
  const pnl = (Math.random() * 30) - 10;
  
  updateOutcome(decisionId, {
    pnl_pct: pnl,
    exit_price: decision.context.price * (1 + pnl / 100),
    days_held: daysLater,
    simulated: true
  });
  
  return pnl;
}

// ─── MAIN ─────────────────────────────────────────────────
module.exports = {
  logDecision,
  updateOutcome,
  getAccuracy,
  simulateOutcome,
  updateAccuracy
};

// Test
if (require.main === module) {
  const id = logDecision('BUY', 'BTC', 'Fear & Greed at 27 (extreme fear) — contrarian signal');
  console.log('Decision logged:', id);
  
  const acc = getAccuracy();
  if (acc) {
    console.log('Current accuracy:', acc.overall_accuracy + '%');
    console.log('Total decisions:', acc.total_decisions);
  }
}
