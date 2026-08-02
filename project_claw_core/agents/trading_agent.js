/**
 * PROJECT CLAW CORE — Trading Agent
 * Connects to Alpha Fund v3.0 orchestrator for paper trading.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ALPHA_FUND_DIR = path.join(__dirname, '..', '..', 'alpha_fund_v3');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'trading_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class TradingAgent {
  constructor() {
    this.orchestrator = path.join(ALPHA_FUND_DIR, 'orchestrator.js');
  }
  
  _exec(command) {
    log(`Alpha Fund command: ${command}`);
    try {
      const output = execSync(`node "${this.orchestrator}" ${command}`, {
        cwd: ALPHA_FUND_DIR,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 120000
      });
      return { success: true, output: output.trim() };
    } catch(e) {
      log(`Trading error: ${e.message}`);
      return { success: false, error: e.message, output: e.stdout || '' };
    }
  }
  
  status() {
    return this._exec('status');
  }
  
  statusJson() {
    return this._exec('status --json');
  }
  
  research(symbol) {
    return this._exec(`research ${symbol}`);
  }
  
  signals() {
    return this._exec('signals');
  }
  
  trade(symbol, quantity) {
    return this._exec(`trade ${symbol} ${quantity}`);
  }
  
  daily() {
    return this._exec('daily');
  }
  
  parsePortfolio() {
    const portfolioPath = path.join(ALPHA_FUND_DIR, 'data', 'portfolio.json');
    if (!fs.existsSync(portfolioPath)) return null;
    return JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
  }
}

module.exports = { TradingAgent };

if (require.main === module) {
  const agent = new TradingAgent();
  console.log(agent.status());
}
