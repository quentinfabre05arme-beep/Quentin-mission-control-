const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'trading_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class TradingAgent {
  constructor() {}
  async analyze(signal) { log('Analyzing signal ' + signal); return {}; }
  async paperTrade(ticker, side, qty) {
    log(`Paper trade: ${side} ${qty} ${ticker}`);
    return { success: true };
  }
}

module.exports = { TradingAgent };