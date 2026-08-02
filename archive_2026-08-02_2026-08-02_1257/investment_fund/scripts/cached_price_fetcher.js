/**
 * ALPHA FUND - CACHED PRICE FETCHER
 * Uses cached prices when API limits hit
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'data', 'price_cache.json');
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Fallback prices (last known good values)
const FALLBACK_PRICES = {
  MSTR: { price: 93.63, change24h: -4.3 },
  HIMS: { price: 32.74, change24h: 0.1 },
  NVDA: { price: 138.25, change24h: -0.8 },
  TSLA: { price: 319.69, change24h: -14.5 },
  PLTR: { price: 123.37, change24h: -1.0 },
  CRWD: { price: 183.42, change24h: -2.7 },
  SNOW: { price: 265.13, change24h: -1.0 },
  COIN: { price: 161.16, change24h: -3.0 },
  LLY:  { price: 723.45, change24h: 0.5 },
  META: { price: 502.13, change24h: 1.2 },
  AMD:  { price: 162.34, change24h: -1.5 }
};

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const age = Date.now() - (cache.timestamp || 0);
      if (age < CACHE_MAX_AGE_MS) {
        return cache.prices || {};
      }
    }
  } catch {}
  return {};
}

function saveCache(prices) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      timestamp: Date.now(),
      prices
    }, null, 2));
  } catch {}
}

async function fetchWithCache() {
  let prices = {};
  
  try {
    const { fetchAllPrices } = require('./price_fetcher');
    prices = await fetchAllPrices();
    console.log(`✅ Fetched ${Object.keys(prices).length} prices from API`);
  } catch (err) {
    console.log('⚠️ API fetch failed');
  }
  
  // If API returned few/no prices, try cache
  if (Object.keys(prices).length < 5) {
    const cached = loadCache();
    if (Object.keys(cached).length > 0) {
      console.log(`✅ Loaded ${Object.keys(cached).length} cached prices`);
      prices = { ...cached, ...prices }; // API prices override cache
    }
  }
  
  // Always merge fallback for any missing tickers
  for (const [ticker, fallback] of Object.entries(FALLBACK_PRICES)) {
    if (!prices[ticker]) {
      prices[ticker] = fallback;
    }
  }
  
  // Save to cache if we have a good set
  if (Object.keys(prices).length >= 5) {
    saveCache(prices);
  }
  
  return prices;
}

module.exports = { fetchWithCache, loadCache, saveCache };

// CLI
if (require.main === module) {
  (async () => {
    const prices = await fetchWithCache();
    console.log(JSON.stringify(prices, null, 2));
  })();
}
