/**
 * PROJECT CLAW CORE — Market Watcher
 * Watch market data and detect significant moves.
 */

const fs = require('fs');
const path = require('path');
const { AnomalyDetector } = require('../core/anomaly_detector');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'market_watcher.log');
const CACHE_FILE = path.join(__dirname, '..', 'data', 'market_watcher_cache.json');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class MarketWatcher {
  constructor() {
    this.detector = new AnomalyDetector();
    this.cache = this.loadCache();
  }
  
  loadCache() {
    if (fs.existsSync(CACHE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      } catch(e) {
        return {};
      }
    }
    return {};
  }
  
  saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
  }
  
  addPrice(symbol, price) {
    if (!this.cache[symbol]) this.cache[symbol] = [];
    this.cache[symbol].push({ timestamp: new Date().toISOString(), value: price });
    if (this.cache[symbol].length > 100) this.cache[symbol].shift();
    this.saveCache();
  }
  
  checkAnomalies(symbol, thresholdPercent = 3) {
    const data = this.cache[symbol] || [];
    if (data.length < 2) return { symbol, anomalies: [] };
    const anomalies = this.detector.detectChangeRate(data, thresholdPercent);
    return { symbol, anomalies };
  }
  
  getTrend(symbol) {
    const data = this.cache[symbol] || [];
    if (data.length < 2) return { symbol, trend: 'flat' };
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const change = ((last - first) / first) * 100;
    return {
      symbol,
      change_percent: change,
      trend: change > 1 ? 'up' : change < -1 ? 'down' : 'flat'
    };
  }
}

module.exports = { MarketWatcher };

if (require.main === module) {
  const mw = new MarketWatcher();
  mw.addPrice('BTC', 63000);
  mw.addPrice('BTC', 64500);
  mw.addPrice('BTC', 63258);
  console.log(JSON.stringify(mw.checkAnomalies('BTC', 2), null, 2));
  console.log(JSON.stringify(mw.getTrend('BTC'), null, 2));
}
