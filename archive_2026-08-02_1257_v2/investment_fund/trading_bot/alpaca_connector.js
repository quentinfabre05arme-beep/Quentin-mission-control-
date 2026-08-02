/**
 * ALPACA PAPER TRADING CONNECTOR
 * Real broker API integration (free paper trading tier)
 * 
 * Setup:
 * 1. Sign up at https://alpaca.markets (free)
 * 2. Get API keys from dashboard
 * 3. Set env vars: ALPACA_API_KEY and ALPACA_SECRET_KEY
 * 4. Test: node alpaca_connector.js test
 */

const https = require('https');

const ALPACA_CONFIG = {
  PAPER_URL: 'paper-api.alpaca.markets',
  API_KEY: process.env.ALPACA_API_KEY || null,
  API_SECRET: process.env.ALPACA_SECRET_KEY || null,
};

function alpacaRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    if (!ALPACA_CONFIG.API_KEY || ALPACA_CONFIG.API_KEY === 'PK_PLACEHOLDER') {
      reject(new Error('Alpaca API keys not configured. Get free keys at https://alpaca.markets'));
      return;
    }

    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: ALPACA_CONFIG.PAPER_URL,
      port: 443,
      path: `/v2${endpoint}`,
      method,
      headers: {
        'APCA-API-KEY-ID': ALPACA_CONFIG.API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_CONFIG.API_SECRET,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Alpaca API Error ${res.statusCode}: ${parsed.message || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) req.write(data);
    req.end();
  });
}

// ─── ACCOUNT ───────────────────────────────────────────────────────

async function getAccount() {
  return alpacaRequest('/account');
}

async function getAccountConfig() {
  return alpacaRequest('/account/configurations');
}

// ─── ORDERS ────────────────────────────────────────────────────────

async function submitOrder(params) {
  // params: { symbol, qty, side, type, time_in_force, limit_price, stop_price }
  const defaults = {
    type: 'market',
    time_in_force: 'day',
  };
  return alpacaRequest('/orders', 'POST', { ...defaults, ...params });
}

async function getOrders(status = 'open') {
  return alpacaRequest(`/orders?status=${status}`);
}

async function getOrder(orderId) {
  return alpacaRequest(`/orders/${orderId}`);
}

async function cancelOrder(orderId) {
  return alpacaRequest(`/orders/${orderId}`, 'DELETE');
}

async function cancelAllOrders() {
  return alpacaRequest('/orders', 'DELETE');
}

// ─── POSITIONS ───────────────────────────────────────────────────

async function getPositions() {
  return alpacaRequest('/positions');
}

async function getPosition(symbol) {
  return alpacaRequest(`/positions/${symbol}`);
}

async function closePosition(symbol) {
  return alpacaRequest(`/positions/${symbol}`, 'DELETE');
}

async function closeAllPositions() {
  return alpacaRequest('/positions', 'DELETE');
}

// ─── ASSETS ──────────────────────────────────────────────────────

async function getAssets(status = 'active') {
  return alpacaRequest(`/assets?status=${status}`);
}

async function getAsset(symbol) {
  return alpacaRequest(`/assets/${symbol}`);
}

// ─── CLOCK / CALENDAR ────────────────────────────────────────────

async function getClock() {
  return alpacaRequest('/clock');
}

async function getCalendar(start, end) {
  let url = '/calendar';
  if (start && end) url += `?start=${start}&end=${end}`;
  return alpacaRequest(url);
}

// ─── HIGHER-LEVEL FUNCTIONS ──────────────────────────────────────

async function submitPaperBuy(symbol, qty, options = {}) {
  return submitOrder({
    symbol,
    qty,
    side: 'buy',
    ...options,
  });
}

async function submitPaperSell(symbol, qty, options = {}) {
  return submitOrder({
    symbol,
    qty,
    side: 'sell',
    ...options,
  });
}

async function isMarketOpen() {
  const clock = await getClock();
  return clock.is_open;
}

async function getBuyingPower() {
  const account = await getAccount();
  return {
    cash: parseFloat(account.cash),
    buying_power: parseFloat(account.buying_power),
    equity: parseFloat(account.equity),
    daytrade_count: account.daytrade_count,
    status: account.status,
  };
}

// ─── SYNC WITH ALPHA BOT ─────────────────────────────────────────

async function syncWithAlphaBot() {
  const fs = require('fs');
  const path = require('path');
  
  const portfolioFile = path.join(__dirname, '..', 'paper_trading', 'PAPER_PORTFOLIO.json');
  
  try {
    // Get Alpaca positions
    const positions = await getPositions();
    const account = await getAccount();
    
    // Update local portfolio
    const portfolio = JSON.parse(fs.readFileSync(portfolioFile, 'utf8'));
    
    portfolio.cash = parseFloat(account.cash);
    portfolio.current_value = parseFloat(account.equity);
    portfolio.positions = positions.map(p => ({
      ticker: p.symbol,
      shares: parseFloat(p.qty),
      entryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      unrealizedPnl: parseFloat(p.unrealized_pl),
      unrealizedPnlPct: parseFloat(p.unrealized_plpc) * 100,
      market_value: parseFloat(p.market_value),
      alpaca_sync: true,
    }));
    
    fs.writeFileSync(portfolioFile, JSON.stringify(portfolio, null, 2));
    
    console.log('✅ Synced with Alpaca paper account');
    console.log(`   Equity: $${parseFloat(account.equity).toFixed(2)}`);
    console.log(`   Cash: $${parseFloat(account.cash).toFixed(2)}`);
    console.log(`   Positions: ${positions.length}`);
    
    return portfolio;
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    throw err;
  }
}

// ─── TEST CONNECTION ─────────────────────────────────────────────

async function testConnection() {
  console.log('Testing Alpaca Paper Trading Connection...\n');
  
  try {
    const account = await getAccount();
    console.log('✅ Account connected!');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Cash: $${parseFloat(account.cash).toFixed(2)}`);
    console.log(`   Equity: $${parseFloat(account.equity).toFixed(2)}`);
    console.log(`   Buying Power: $${parseFloat(account.buying_power).toFixed(2)}`);
    console.log(`   Daytrades: ${account.daytrade_count}`);
    
    const clock = await getClock();
    console.log(`\n🕐 Market: ${clock.is_open ? 'OPEN' : 'CLOSED'}`);
    console.log(`   Next Open: ${clock.next_open}`);
    console.log(`   Next Close: ${clock.next_close}`);
    
    const positions = await getPositions();
    console.log(`\n📊 Positions: ${positions.length}`);
    positions.forEach(p => {
      console.log(`   ${p.symbol}: ${p.qty} shares @ $${parseFloat(p.avg_entry_price).toFixed(2)} → $${parseFloat(p.current_price).toFixed(2)}`);
    });
    
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

// ─── CLI ─────────────────────────────────────────────────────────

const command = process.argv[2];

(async () => {
  switch (command) {
    case 'test':
      await testConnection();
      break;
    case 'sync':
      await syncWithAlphaBot();
      break;
    case 'account':
      const acc = await getAccount();
      console.log(JSON.stringify(acc, null, 2));
      break;
    case 'positions':
      const pos = await getPositions();
      console.log(JSON.stringify(pos, null, 2));
      break;
    case 'orders':
      const orders = await getOrders();
      console.log(JSON.stringify(orders, null, 2));
      break;
    case 'clock':
      const clock = await getClock();
      console.log(JSON.stringify(clock, null, 2));
      break;
    case 'buy':
      const buySymbol = process.argv[3];
      const buyQty = process.argv[4];
      if (!buySymbol || !buyQty) {
        console.log('Usage: node alpaca_connector.js buy SYMBOL QTY');
        return;
      }
      const buyResult = await submitPaperBuy(buySymbol, buyQty);
      console.log('✅ Order submitted:', JSON.stringify(buyResult, null, 2));
      break;
    case 'sell':
      const sellSymbol = process.argv[3];
      const sellQty = process.argv[4];
      if (!sellSymbol || !sellQty) {
        console.log('Usage: node alpaca_connector.js sell SYMBOL QTY');
        return;
      }
      const sellResult = await submitPaperSell(sellSymbol, sellQty);
      console.log('✅ Order submitted:', JSON.stringify(sellResult, null, 2));
      break;
    default:
      console.log('Alpaca Paper Trading Connector');
      console.log('');
      console.log('Setup:');
      console.log('  1. Sign up at https://alpaca.markets');
      console.log('  2. Get API keys from dashboard');
      console.log('  3. Set env vars:');
      console.log('     $env:ALPACA_API_KEY="PK_XXXXX"');
      console.log('     $env:ALPACA_SECRET_KEY="XXXXX"');
      console.log('');
      console.log('Commands:');
      console.log('  test     - Test connection');
      console.log('  sync     - Sync with Alpha Bot portfolio');
      console.log('  account  - Show account details');
      console.log('  positions- List positions');
      console.log('  orders   - List orders');
      console.log('  clock    - Market clock');
      console.log('  buy SYM QTY  - Submit buy order');
      console.log('  sell SYM QTY - Submit sell order');
  }
})();

module.exports = {
  getAccount,
  getBuyingPower,
  submitOrder,
  submitPaperBuy,
  submitPaperSell,
  getPositions,
  getPosition,
  closePosition,
  getOrders,
  cancelOrder,
  cancelAllOrders,
  isMarketOpen,
  getClock,
  getCalendar,
  getAssets,
  syncWithAlphaBot,
  testConnection,
};
