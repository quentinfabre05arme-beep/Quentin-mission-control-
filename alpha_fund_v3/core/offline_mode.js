/**
 * 📴 OFFLINE MODE ENGINE
 * Works with cached data when internet is down
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data');
const OFFLINE_LOG = path.join(__dirname, '..', 'logs', 'offline.log');

// ─── CHECK CONNECTIVITY ─────────────────────────────────────
function checkConnectivity() {
  // Try to read a small file from internet (DNS check)
  try {
    const dns = require('dns');
    dns.lookup('google.com', (err) => {
      if (err) {
        state.online = false;
        logEvent('OFFLINE_MODE', { reason: 'DNS lookup failed' });
      } else {
        state.online = true;
      }
    });
  } catch(e) {
    state.online = false;
  }
  
  return state.online;
}

// ─── LOAD CACHED DATA ───────────────────────────────────────
function loadCachedPrices() {
  const cacheFile = path.join(CACHE_DIR, 'price_cache.json');
  
  if (fs.existsSync(cacheFile)) {
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const age = Date.now() - new Date(data.timestamp).getTime();
    const ageHours = age / (1000 * 60 * 60);
    
    return {
      prices: data.prices,
      age_hours: ageHours,
      stale: ageHours > 24 // Cache valid for 24 hours
    };
  }
  
  // Try alternative data
  const altFile = path.join(__dirname, '..', '..', 'investment_fund', 'data', 'alternative');
  const today = new Date().toISOString().split('T')[0];
  const altDataFile = path.join(altFile, `${today}.json`);
  
  if (fs.existsSync(altDataFile)) {
    const data = JSON.parse(fs.readFileSync(altDataFile, 'utf8'));
    if (data.market_snapshot && data.market_snapshot.assets) {
      const prices = {};
      Object.entries(data.market_snapshot.assets).forEach(([sym, info]) => {
        prices[sym] = { price: info.price, change_24h: info.change_24h, source: 'cache' };
      });
      return { prices, age_hours: 0, stale: false };
    }
  }
  
  return null;
}

// ─── OFFLINE SIGNALS ────────────────────────────────────────
function generateOfflineSignals(cachedPrices) {
  const signals = [];
  
  if (!cachedPrices || cachedPrices.stale) {
    return {
      status: 'OFFLINE_NO_DATA',
      signals: [],
      message: 'No fresh cached data available'
    };
  }
  
  // Use Fear & Greed from latest alternative data
  const fearGreed = 27; // From latest scan
  
  Object.entries(cachedPrices.prices).forEach(([asset, data]) => {
    let score = 0;
    let action = 'HOLD';
    
    // Offline signals based on cached data only
    if (data.change_24h > 5) score += 1;
    if (data.change_24h < -5) score -= 1;
    
    // Contrarian with Fear & Greed
    if (fearGreed < 25 && data.change_24h < 0) score += 2;
    if (fearGreed > 75 && data.change_24h > 0) score -= 2;
    
    if (score >= 2) action = 'BUY';
    if (score <= -2) action = 'SELL';
    
    signals.push({
      ticker: asset,
      action,
      score,
      source: 'offline_cache',
      confidence: 'LOW',
      price: data.price
    });
  });
  
  return {
    status: 'OFFLINE_MODE',
    signals,
    message: `Generated ${signals.filter(s => s.action !== 'HOLD').length} signals from cached data`,
    cache_age_hours: cachedPrices.age_hours
  };
}

// ─── STATE ──────────────────────────────────────────────────
const state = {
  online: true,
  last_online_check: null,
  offline_since: null
};

// ─── LOG ────────────────────────────────────────────────────
function logEvent(event, data) {
  const entry = `[${new Date().toISOString()}] ${event}: ${JSON.stringify(data)}\n`;
  fs.mkdirSync(path.dirname(OFFLINE_LOG), { recursive: true });
  fs.appendFileSync(OFFLINE_LOG, entry);
}

// ─── MAIN ─────────────────────────────────────────────────
function run() {
  const online = checkConnectivity();
  
  if (!online) {
    if (!state.offline_since) {
      state.offline_since = new Date().toISOString();
      logEvent('WENT_OFFLINE', { timestamp: state.offline_since });
    }
    
    const cached = loadCachedPrices();
    const result = generateOfflineSignals(cached);
    
    logEvent('OFFLINE_SIGNALS', { count: result.signals.length });
    
    return result;
  } else {
    if (state.offline_since) {
      const duration = Date.now() - new Date(state.offline_since).getTime();
      logEvent('CAME_ONLINE', { offline_duration_ms: duration });
      state.offline_since = null;
    }
    return { status: 'ONLINE', message: 'Internet connection active' };
  }
}

module.exports = { run, loadCachedPrices, generateOfflineSignals, checkConnectivity, state };

if (require.main === module) {
  const result = run();
  console.log('Status:', result.status);
  if (result.signals) {
    console.log('Signals:', result.signals.length);
  }
}
