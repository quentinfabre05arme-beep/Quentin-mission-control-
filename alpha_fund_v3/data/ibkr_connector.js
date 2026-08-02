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

// ─── CONFIG ─────────────────────────────────────────────────
const IBKR_CONFIG = {
  host: '127.0.0.1',        // TWS running locally
  port: 7496,               // TWS default port (7496 TWS, 4001 Gateway)
  clientId: 1,              // Unique client ID
  enabled: true             // ✅ ENABLED — Ready to connect
};

const CACHE_FILE = path.join(__dirname, '..', 'data', 'ibkr_cache.json');

// ─── PRICE FETCHER ──────────────────────────────────────────
async function fetchIBKRPrices(tickers) {
  if (!IBKR_CONFIG.enabled) {
    console.log('⚠️  IBKR not enabled. Set IBKR_CONFIG.enabled = true after TWS setup');
    return null;
  }
  
  try {
    // Dynamic import to avoid loading if not configured
    const { IBApi, EventName, Contract } = require('@stoqey/ib');
    
    const ib = new IBApi({
      host: IBKR_CONFIG.host,
      port: IBKR_CONFIG.port,
      clientId: IBKR_CONFIG.clientId
    });
    
    const prices = {};
    
    return new Promise((resolve, reject) => {
      let pendingRequests = tickers.length;
      
      // Market data callback
      ib.on(EventName.tickPrice, (reqId, tickType, price, attrib) => {
        if (tickType === 4 || tickType === 9) { // Last price or Close price
          const ticker = tickers[reqId];
          if (ticker) {
            prices[ticker] = {
              price: price,
              source: 'IBKR',
              timestamp: new Date().toISOString()
            };
            pendingRequests--;
            
            if (pendingRequests <= 0) {
              ib.disconnect();
              resolve(prices);
            }
          }
        }
      });
      
      // Error handling
      ib.on(EventName.error, (err) => {
        console.error('IBKR Error:', err);
        ib.disconnect();
        reject(err);
      });
      
      // Connect and request data
      ib.connect();
      
      tickers.forEach((ticker, index) => {
        const contract = new Contract();
        contract.symbol = ticker;
        contract.secType = 'STK';  // Stock
        contract.exchange = 'SMART';
        contract.currency = 'USD';
        
        // For crypto, use different contract type
        if (['BTC', 'ETH'].includes(ticker)) {
          contract.secType = 'CRYPTO';
        }
        
        ib.reqMktData(index, contract, '', false, false);
      });
      
      // Timeout fallback
      setTimeout(() => {
        ib.disconnect();
        resolve(prices);
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
  checkSetup
};
