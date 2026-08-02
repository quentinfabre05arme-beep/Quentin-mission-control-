const fs = require('fs').promises;
const path = require('path');

class DataAuditLogger {
  constructor() {
    this.auditDir = path.join(__dirname, 'audit_logs');
    this.ensureDir();
  }

  async ensureDir() {
    try {
      await fs.mkdir(this.auditDir, { recursive: true });
    } catch {}
  }

  async logDataValidation(symbol, price, sources) {
    const entry = {
      timestamp: new Date().toISOString(),
      symbol,
      price,
      sources,
      validation: {
        spread: this.calculateSpread(sources),
        consensus: this.checkConsensus(sources),
        timestamp: Date.now()
      }
    };

    const filename = path.join(this.auditDir, `${new Date().toISOString().split('T')[0]}_validation.jsonl`);
    await fs.appendFile(filename, JSON.stringify(entry) + '\n');
  }

  async logTradeExecution(trade) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'TRADE',
      symbol: trade.symbol,
      side: trade.side,
      size: trade.size,
      entryPrice: trade.entryPrice,
      dataSources: trade.dataSources,
      validationStatus: trade.validationStatus
    };

    const filename = path.join(this.auditDir, `${new Date().toISOString().split('T')[0]}_trades.jsonl`);
    await fs.appendFile(filename, JSON.stringify(entry) + '\n');
  }

  async logAlternativeData(symbol, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'ALTERNATIVE',
      symbol,
      ...data
    };

    const filename = path.join(this.auditDir, `${new Date().toISOString().split('T')[0]}_alternative.jsonl`);
    await fs.appendFile(filename, JSON.stringify(entry) + '\n');
  }

  calculateSpread(sources) {
    const prices = Object.values(sources).filter(p => typeof p === 'number');
    if (prices.length < 2) return 0;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    return ((max - min) / min * 100).toFixed(4);
  }

  checkConsensus(sources) {
    const prices = Object.values(sources).filter(p => typeof p === 'number');
    if (prices.length < 2) return false;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return prices.every(p => Math.abs(p - avg) / avg < 0.005);
  }

  async getAuditReport(date) {
    const filename = path.join(this.auditDir, `${date}_validation.jsonl`);
    try {
      const data = await fs.readFile(filename, 'utf8');
      const lines = data.trim().split('\n').filter(l => l);
      return lines.map(l => JSON.parse(l));
    } catch {
      return [];
    }
  }
}

module.exports = DataAuditLogger;