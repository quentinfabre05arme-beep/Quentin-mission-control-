/**
 * Interactive Brokers (IBKR) Market Data Connector
 * Replaces Twelve Data API for real-time quotes
 * 
 * Setup:
 * 1. Install TWS or IB Gateway
 * 2. Enable API connections in TWS: Edit → Global Configuration → API → Enable "ActiveX and Socket Clients"
 * 3. Set socket port (default 7496 for TWS, 4001 for IB Gateway)
 * 4. Allow connections from localhost or specific IP
 * 
 * Library: @stoqey/ib (modern TypeScript/JS wrapper)
 * npm install @stoqey/ib
 */

const fs = require('fs');
const path = require('path');

// ─── SAFETY GUARD ───────────────────────────────────────────
// This connector is READ-ONLY. It never places trades.
// All trading remains in Alpha Fund's paper trading mode.
const TRADING_DISABLED = true;

function placeOrder() {
  throw new Error('IBKR trading is DISABLED. This connector is read-only for market data only.');
}

// ─── CONFIG ─────────────────────────────────────────────────
const IBKR_CONFIG = {
  host: '127.0.0.1',        // TWS running locally
  port: 7496,               // TWS default port (7496 TWS, 4001 Gateway)
  clientId: 1,              // Base client ID; actual ID rotates to avoid stuck sessions
  enabled: true             // ✅ ENABLED — Ready to connect
};

const CACHE_FILE = path.join(__dirname, '..', 'data', 'ibkr_cache.json');
let lastClientId = IBKR_CONFIG.clientId;

function getClientId() {
  lastClientId = (lastClientId % 100) + 1;
  return lastClientId;
}

// ─── PRICE FETCHER ──────────────────────────────────────────
async function fetchIBKRPrices(tickers) {
  if (!IBKR_CONFIG.enabled) {
    console.log('⚠️  IBKR not enabled. Set IBKR_CONFIG.enabled = true after TWS setup');
    return null;
  }
  
  try {
    // Dynamic import to avoid loading if not configured
    const { IBApi, EventName, Stock, Crypto, MarketDataType } = require('@stoqey/ib');
    
    const ib = new IBApi({
      host: IBKR_CONFIG.host,
      port: IBKR_CONFIG.port,
      clientId: IBKR_CONFIG.clientId
    });
    
    const prices = {};
    let resolved = false;
    
    return new Promise((resolve, reject) => {
      
      function finish() {
        if (!resolved) {
          resolved = true;
          try { ib.disconnect(); } catch(e) {}
          resolve(Object.keys(prices).length > 0 ? prices : null);
        }
      }
      
      // Market data callback
      ib.on(EventName.tickPrice, (reqId, tickType, price, attrib) => {
        // Tick types: 4=last, 9=close, 68=delayed-last, 75=delayed-close
        const validPriceTypes = [4, 9, 68, 75];
        if (validPriceTypes.includes(tickType) && price > 0) {
          const ticker = tickers[reqId];
          if (ticker) {
            prices[ticker] = {
              price: price,
              change_24h: 0,
              source: 'IBKR',
              timestamp: new Date().toISOString()
            };
          }
        }
      });
      
      // Error handling
      ib.on(EventName.error, (err) => {
        const msg = err.message || String(err);
        if (msg.includes('ECONNREFUSED')) {
          console.log('   ⚠️ IBKR TWS not running');
        } else if (msg.includes('delayed')) {
          console.log('   ℹ️ IBKR using delayed market data');
          return;
        } else if (msg.includes('Not connected')) {
          console.log('   ⚠️ IBKR not connected');
        } else {
          console.error('IBKR Error:', msg);
        }
        try { ib.disconnect(); } catch(e) {}
        if (!resolved) reject(err);
      });
      
      // Connect and request data
      ib.connect(getClientId());
      
      // Request delayed market data (no real-time subscription needed)
      try {
        ib.reqMarketDataType(MarketDataType.DELAYED);
      } catch(e) {}
      
      tickers.forEach((ticker, index) => {
        // Skip crypto — IBKR requires separate crypto subscription
        if (['BTC', 'ETH'].includes(ticker)) return;
        
        const contract = new Stock(ticker, 'SMART', 'USD');
        ib.reqMktData(index, contract, '', false, false);
      });
      
      // Timeout fallback
      setTimeout(() => {
        finish();
      }, 10000);
    });
    
  } catch (e) {
    console.error('❌ IBKR connection failed:', e.message);
    return null;
  }
}

// ─── HYBRID FALLBACK ───────────────────────────────────────
async function getPricesWithFallback(tickers) {
  // Try IBKR first
  const ibkrPrices = await fetchIBKRPrices(tickers);
  if (ibkrPrices) {
    saveCache(ibkrPrices);
    return ibkrPrices;
  }
  
  // Fallback to cache
  const cached = loadCache();
  if (cached) {
    console.log('📦 Using cached IBKR prices');
    return cached;
  }
  
  // Fallback to Twelve Data (legacy)
  console.log('📡 Falling back to Twelve Data...');
  return null;
}

function saveCache(prices) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({
    prices,
    timestamp: new Date().toISOString()
  }, null, 2));
}

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    // Cache valid for 5 minutes
    if (Date.now() - new Date(data.timestamp).getTime() < 5 * 60 * 1000) {
      return data.prices;
    }
  }
  return null;
}

// ─── QUICK SETUP CHECK ──────────────────────────────────────
function checkSetup() {
  console.log('\n🔧 IBKR SETUP CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. TWS or IB Gateway installed?');
  console.log('2. API enabled in TWS? (Edit → Global Config → API)');
  console.log('3. Port configured:', IBKR_CONFIG.port);
  console.log('4. Client ID:', IBKR_CONFIG.clientId);
  console.log('');
  console.log('To enable:');
  console.log('  IBKR_CONFIG.enabled = true');
  console.log('  npm install @stoqey/ib');
  console.log('');
  console.log('Test:');
  console.log('  node ibkr_connector.js test');
  console.log('');
}

// ─── MAIN ─────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'test') {
    IBKR_CONFIG.enabled = true;
    fetchIBKRPrices(['AAPL', 'TSLA']).then(prices => {
      console.log('IBKR Prices:', prices);
    }).catch(console.error);
  } else {
    checkSetup();
  }
}

module.exports = {
  fetchIBKRPrices,
  getPricesWithFallback,
  IBKR_CONFIG,
  checkSetup,
  placeOrder,
  TRADING_DISABLED
};
