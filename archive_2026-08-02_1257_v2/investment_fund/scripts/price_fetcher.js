/**
 * ALPHA FUND - UNIFIED PRICE FETCHER
 * Gets real prices for all tracked assets
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'data', '.env.local') });

const TWELVE_KEY = process.env.TWELVE_DATA_API_KEY;

// Asset definitions with proper type
const ASSETS = {
  // Crypto - use CoinGecko
  BTC: { type: 'crypto', coingeckoId: 'bitcoin' },
  ETH: { type: 'crypto', coingeckoId: 'ethereum' },
  SOL: { type: 'crypto', coingeckoId: 'solana' },
  
  // Stocks - use Twelve Data
  MSTR: { type: 'stock' },
  HIMS: { type: 'stock' },
  NVDA: { type: 'stock' },
  TSLA: { type: 'stock' },
  PLTR: { type: 'stock' },
  CRWD: { type: 'stock' },
  SNOW: { type: 'stock' },
  COIN: { type: 'stock' },
  LLY:  { type: 'stock' },
  META: { type: 'stock' },
  AMD:  { type: 'stock' },
};

function fetchCrypto(ids) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.coingecko.com',
      path: `/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      method: 'GET',
      headers: { 'User-Agent': 'AlphaFund/1.0' }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = {};
          for (const [symbol, cfg] of Object.entries(ASSETS)) {
            if (cfg.type === 'crypto' && json[cfg.coingeckoId]) {
              result[symbol] = {
                price: json[cfg.coingeckoId].usd,
                change24h: json[cfg.coingeckoId].usd_24h_change
              };
            }
          }
          resolve(result);
        } catch { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    req.setTimeout(5000, () => { req.destroy(); resolve({}); });
    req.end();
  });
}

function fetchStock(symbol) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/quote?symbol=${symbol}&apikey=${TWELVE_KEY}`,
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.close) {
            resolve({
              price: parseFloat(json.close),
              change24h: parseFloat(json.percent_change)
            });
          } else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function fetchAllPrices() {
  const result = {};
  
  // Crypto first (batch)
  const cryptoIds = Object.entries(ASSETS)
    .filter(([_, cfg]) => cfg.type === 'crypto')
    .map(([_, cfg]) => cfg.coingeckoId);
  
  const cryptoPrices = await fetchCrypto(cryptoIds);
  Object.assign(result, cryptoPrices);
  
  // Stocks sequentially with delay
  const stocks = Object.entries(ASSETS).filter(([_, cfg]) => cfg.type === 'stock');
  for (const [symbol] of stocks) {
    const price = await fetchStock(symbol);
    if (price) result[symbol] = price;
    await new Promise(r => setTimeout(r, 300));
  }
  
  return result;
}

module.exports = { fetchAllPrices, ASSETS };

// CLI
if (require.main === module) {
  (async () => {
    const prices = await fetchAllPrices();
    console.log(JSON.stringify(prices, null, 2));
  })();
}
