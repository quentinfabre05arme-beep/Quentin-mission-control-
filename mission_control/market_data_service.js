/**
 * MARKET DATA SERVICE - Multi-Source Resilient Price Fetcher
 * Always returns fresh prices via cascading fallbacks
 * Sources: Twelve Data → CoinGecko → Yahoo Finance → Cached
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  TWELVE_DATA_KEY: process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api'),
  CACHE_FILE: path.join(__dirname, 'market_data.json'),
  MAX_AGE_MINUTES: 5,
  TIMEOUT_MS: 10000
};

// Asset mapping across sources - EXPANDED WATCHLIST (12 tickers)
const ASSETS = {
  // Tier 1: Core Holdings
  BTC: {
    twelvedata: 'BTC/USD',
    coingecko: 'bitcoin',
    yahoo: 'BTC-USD',
    symbol: 'BTC',
    sector: 'Crypto',
    tier: 1
  },
  ETH: {
    twelvedata: 'ETH/USD',
    coingecko: 'ethereum',
    yahoo: 'ETH-USD',
    symbol: 'ETH',
    sector: 'Crypto',
    tier: 1
  },
  NVDA: {
    twelvedata: 'NVDA',
    coingecko: null,
    yahoo: 'NVDA',
    symbol: 'NVDA',
    sector: 'AI/Tech',
    tier: 1
  },
  TSLA: {
    twelvedata: 'TSLA',
    coingecko: null,
    yahoo: 'TSLA',
    symbol: 'TSLA',
    sector: 'EV/Autonomy',
    tier: 1
  },
  // Tier 2: Growth & Exposure
  MSTR: {
    twelvedata: 'MSTR',
    coingecko: null,
    yahoo: 'MSTR',
    symbol: 'MSTR',
    sector: 'Bitcoin Proxy',
    tier: 2
  },
  AAPL: {
    twelvedata: 'AAPL',
    coingecko: null,
    yahoo: 'AAPL',
    symbol: 'AAPL',
    sector: 'Consumer Tech',
    tier: 2
  },
  HIMS: {
    twelvedata: 'HIMS',
    coingecko: null,
    yahoo: 'HIMS',
    symbol: 'HIMS',
    sector: 'Telehealth',
    tier: 2
  },
  COIN: {
    twelvedata: 'COIN',
    coingecko: null,
    yahoo: 'COIN',
    symbol: 'COIN',
    sector: 'Crypto Infrastructure',
    tier: 2
  },
  // Tier 3: Diversification & Defense
  SPY: {
    twelvedata: 'SPY',
    coingecko: null,
    yahoo: 'SPY',
    symbol: 'SPY',
    sector: 'Index',
    tier: 3
  },
  QQQ: {
    twelvedata: 'QQQ',
    coingecko: null,
    yahoo: 'QQQ',
    symbol: 'QQQ',
    sector: 'Tech Index',
    tier: 3
  },
  GLD: {
    twelvedata: 'GLD',
    coingecko: null,
    yahoo: 'GLD',
    symbol: 'GLD',
    sector: 'Gold',
    tier: 3
  },
  TLT: {
    twelvedata: 'TLT',
    coingecko: null,
    yahoo: 'TLT',
    symbol: 'TLT',
    sector: 'Bonds',
    tier: 3
  }
};

// HTTP request helper
function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'OpenClawMarketData/1.0 (research; contact: openclaw-local)',
      ...(options.headers || {})
    };
    const req = https.get(url, { ...options, headers, timeout: CONFIG.TIMEOUT_MS }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message} | body: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Source 1: Twelve Data API - for current price
async function fetchTwelveData(symbol) {
  const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${CONFIG.TWELVE_DATA_KEY}`;
  const data = await fetchJSON(url);
  if (data.price) {
    return {
      price: parseFloat(data.price),
      source: 'twelvedata',
      timestamp: new Date().toISOString()
    };
  }
  throw new Error(`Twelve Data error: ${data.message || 'No price'}`);
}

// Source 1b: Twelve Data quote for extended data including change
async function fetchTwelveDataQuote(symbol) {
  const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${CONFIG.TWELVE_DATA_KEY}`;
  const data = await fetchJSON(url);
  if (data.close) {
    return {
      price: parseFloat(data.close),
      change_24h: data.percent_change ? parseFloat(data.percent_change) : 0,
      source: 'twelvedata',
      timestamp: new Date().toISOString()
    };
  }
  throw new Error(`Twelve Data quote error: ${data.message || 'No data'}`);
}

// Source 2: CoinGecko (free, no key needed for basic calls)
async function fetchCoinGecko(coinId) {
  if (!coinId) throw new Error('No CoinGecko ID for this asset');
  await new Promise(r => setTimeout(r, 2000));
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
  const data = await fetchJSON(url);
  if (data[coinId]) {
    return {
      price: data[coinId].usd,
      change_24h: data[coinId].usd_24h_change || 0,
      source: 'coingecko',
      timestamp: new Date().toISOString()
    };
  }
  throw new Error('CoinGecko: No data');
}

// Source 2b: CoinGecko markets (crypto only, richer data)
async function fetchCoinGeckoMarkets(coinId) {
  if (!coinId) throw new Error('No CoinGecko ID for this asset');
  await new Promise(r => setTimeout(r, 2000));
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}`;
  const data = await fetchJSON(url);
  if (data && data[0]) {
    return {
      price: data[0].current_price,
      change_24h: data[0].price_change_percentage_24h || 0,
      source: 'coingecko',
      timestamp: new Date().toISOString()
    };
  }
  throw new Error('CoinGecko markets: No data');
}

// Source 3: Yahoo Finance (unofficial endpoint)
async function fetchYahoo(symbol) {
  // Using Yahoo Finance query1 endpoint (rate limited but no key needed)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const data = await fetchJSON(url);
  if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
    const meta = data.chart.result[0].meta;
    const prevClose = meta.previousClose || meta.regularMarketPrice;
    const current = meta.regularMarketPrice;
    const change = ((current - prevClose) / prevClose) * 100;
    return {
      price: current,
      change_24h: change,
      source: 'yahoo',
      timestamp: new Date().toISOString()
    };
  }
  throw new Error('Yahoo: No price data');
}

// Cascade fetch for a single asset
async function fetchAssetWithFallback(assetKey) {
  const asset = ASSETS[assetKey];
  const errors = [];
  
  // Staggered delay: Tier 1 (0-1s), Tier 2 (1-2s), Tier 3 (2-3s) to respect rate limits
  const tier = asset.tier || 2;
  const assetIndex = Object.keys(ASSETS).indexOf(assetKey);
  const delayMs = (tier - 1) * 1000 + (assetIndex % 4) * 250;
  await new Promise(r => setTimeout(r, delayMs));
  
  // Try Twelve Data quote endpoint first (has change %)
  try {
    console.log(`[${assetKey}] Trying Twelve Data quote...`);
    const data = await fetchTwelveDataQuote(asset.twelvedata);
    return { ...data, symbol: assetKey };
  } catch (e) {
    errors.push(`Twelve Data quote: ${e.message}`);
    // If rate limited or failed, try simple price endpoint
    if (!e.message.includes('rate limit') && !e.message.includes('credits')) {
      try {
        console.log(`[${assetKey}] Trying Twelve Data price...`);
        const data = await fetchTwelveData(asset.twelvedata);
        // Get 24h change from CoinGecko for crypto
        if (asset.coingecko) {
          try {
            const cgData = await fetchCoinGecko(asset.coingecko);
            return { ...data, change_24h: cgData.change_24h, symbol: assetKey };
          } catch {
            return { ...data, change_24h: 0, symbol: assetKey };
          }
        }
        return { ...data, change_24h: 0, symbol: assetKey };
      } catch (e2) {
        errors.push(`Twelve Data price: ${e2.message}`);
      }
    }
    console.log(`[${assetKey}] Twelve Data failed, trying fallbacks...`);
  }
  
  // Try CoinGecko for crypto (free tier, no key needed)
  if (asset.coingecko) {
    try {
      console.log(`[${assetKey}] Trying CoinGecko simple...`);
      const data = await fetchCoinGecko(asset.coingecko);
      return { ...data, symbol: assetKey };
    } catch (e) {
      errors.push(`CoinGecko simple: ${e.message}`);
    }
    try {
      console.log(`[${assetKey}] Trying CoinGecko markets...`);
      const data = await fetchCoinGeckoMarkets(asset.coingecko);
      return { ...data, symbol: assetKey };
    } catch (e) {
      errors.push(`CoinGecko markets: ${e.message}`);
    }
  }

  // Try Yahoo Finance as last resort
  try {
    console.log(`[${assetKey}] Trying Yahoo Finance...`);
    // Increase delay to respect Yahoo rate limits
    await new Promise(r => setTimeout(r, 3000));
    const data = await fetchYahoo(asset.yahoo);
    return { ...data, symbol: assetKey };
  } catch (e) {
    errors.push(`Yahoo: ${e.message}`);
  }
  
  // All sources failed - return cached if available
  console.log(`[${assetKey}] All sources failed, using cache...`);
  const cached = loadCache();
  if (cached.assets[assetKey]) {
    return {
      ...cached.assets[assetKey],
      symbol: assetKey,
      source: 'cached',
      stale: true
    };
  }
  
  throw new Error(`All sources failed for ${assetKey}: ${errors.join('; ')}`);
}

// Load cache
function loadCache() {
  try {
    const data = fs.readFileSync(CONFIG.CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      timestamp: new Date().toISOString(),
      assets: {}
    };
  }
}

// Save cache
function saveCache(data) {
  fs.writeFileSync(CONFIG.CACHE_FILE, JSON.stringify(data, null, 2));
}

// Check if cache is fresh
function isCacheFresh(timestamp) {
  const cacheTime = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (now - cacheTime) / 1000 / 60;
  return diffMinutes < CONFIG.MAX_AGE_MINUTES;
}

// Main fetch all assets
async function fetchAllPrices(forceRefresh = false) {
  const cache = loadCache();
  
  // Return cache if fresh and not forcing
  if (!forceRefresh && isCacheFresh(cache.timestamp)) {
    console.log('Using fresh cache...');
    return { ...cache, fromCache: true };
  }
  
  // Fetch all assets in parallel - DYNAMIC based on ASSETS config
  console.log('Fetching fresh prices...');
  const assetKeys = Object.keys(ASSETS);
  const promises = assetKeys.map(key => fetchAssetWithFallback(key));
  const results = await Promise.allSettled(promises);
  
  const assets = {};
  const failures = [];
  
  results.forEach((result, index) => {
    const symbol = assetKeys[index];
    if (result.status === 'fulfilled') {
      assets[symbol] = {
        price: result.value.price,
        change_24h: result.value.change_24h || 0,
        source: result.value.source,
        signal: calculateSignal(result.value.change_24h || 0)
      };
    } else {
      failures.push(`${symbol}: ${result.reason.message}`);
      // Use cached if available
      if (cache.assets[symbol]) {
        assets[symbol] = { ...cache.assets[symbol], source: 'cached', stale: true };
      }
    }
  });
  
  const output = {
    timestamp: new Date().toISOString(),
    assets,
    _meta: {
      fromCache: false,
      failures: failures.length > 0 ? failures : undefined,
      sources: Object.values(assets).map(a => a.source)
    }
  };
  
  // Save to cache
  saveCache(output);
  
  return output;
}

// Calculate signal based on 24h change
function calculateSignal(change24h) {
  if (change24h > 5) return 'BULLISH';
  if (change24h > 2) return 'BULLISH';
  if (change24h < -5) return 'BEARISH';
  if (change24h < -2) return 'BEARISH';
  return 'NEUTRAL';
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--refresh') || args.includes('-r');
  const format = args.includes('--json') ? 'json' : 'table';
  
  try {
    const data = await fetchAllPrices(forceRefresh);
    
    if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\n=== MARKET DATA ===');
      console.log(`Last Updated: ${data.timestamp}`);
      console.log(`Status: ${data.fromCache ? 'FROM CACHE' : 'LIVE'}`);
      if (data._meta?.failures) {
        console.log(`⚠️ Failures: ${data._meta.failures.join(', ')}`);
      }
      console.log('');
      console.log('| Asset | Price | 24h Change | Source | Signal | Tier | Sector |');
      console.log('|-------|-------|------------|--------|--------|------|--------|');
      
      Object.entries(data.assets).forEach(([symbol, asset]) => {
        const changeStr = asset.change_24h >= 0 ? `+${asset.change_24h.toFixed(2)}%` : `${asset.change_24h.toFixed(2)}%`;
        const stale = asset.stale ? ' (STALE)' : '';
        const tier = ASSETS[symbol]?.tier || '-';
        const sector = ASSETS[symbol]?.sector || '-';
        console.log(`| ${symbol.padEnd(5)} | $${asset.price.toLocaleString()} | ${changeStr.padEnd(10)} | ${asset.source}${stale} | ${asset.signal.padEnd(8)} | ${tier} | ${sector} |`);
      });
      
      console.log('\nSources used:', [...new Set(data._meta?.sources || [])].join(', '));
    }
  } catch (e) {
    console.error('Fatal error:', e.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { fetchAllPrices, fetchAssetWithFallback, loadCache };

// Run if called directly
if (require.main === module) {
  main();
}
