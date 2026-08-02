/**
 * Unified Logger
 * Logs errors, trades, and system events
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
  console.error(`❌ Error logged: ${error.message || error}`);
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

module.exports = { logError, logTrade, logEvent, logSignal };
