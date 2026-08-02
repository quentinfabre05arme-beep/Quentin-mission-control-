/**
 * Unified Logger v2.0
 * ASCII-safe logging for cross-platform compatibility
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logError(error, context = '') {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ERROR: ${error.message || error}\nContext: ${context}\nStack: ${error.stack || 'N/A'}\n---\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'errors.log'), entry);
  console.error(`Error logged: ${error.message || error}`);
}

function logTrade(trade) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] TRADE: ${trade.action} ${trade.ticker} ${trade.quantity} @ $${trade.price}\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'trades.log'), entry);
}

function logEvent(event, data = {}) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] EVENT: ${event}\nData: ${JSON.stringify(data)}\n---\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'events.log'), entry);
}

function logSignal(signal) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] SIGNAL: ${signal.action} ${signal.ticker} | Score: ${signal.score} | Confidence: ${signal.confidence}\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'signals.log'), entry);
}

function logDecision(action, data = {}) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] DECISION: ${action}\nData: ${JSON.stringify(data)}\n---\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'decisions.log'), entry);
}

function logInfo(message, data = {}) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] INFO: ${message}\nData: ${JSON.stringify(data)}\n---\n`;
  fs.appendFileSync(path.join(LOG_DIR, 'info.log'), entry);
}

// ASCII-safe plain logger (no unicode corruption)
function logPlain(level, message, data = {}) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const safeMessage = (message || '').toString().replace(/[^\x00-\x7F]/g, '?');
  const entry = JSON.stringify({
    timestamp,
    level,
    message: safeMessage,
    data
  }) + '\n';
  fs.appendFileSync(path.join(LOG_DIR, 'plain.log'), entry);
}

module.exports = { logError, logTrade, logEvent, logSignal, logDecision, logInfo, logPlain };
