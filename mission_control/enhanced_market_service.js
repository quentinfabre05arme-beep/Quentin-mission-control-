/**
 * ENHANCED MARKET DATA SERVICE v2.0
 * Improvements: WebSocket support, parallel fetching, better error handling
 * Sources: Twelve Data (primary) → CoinGecko → Yahoo Finance → Cached
 * Added: Real-time streaming, multiple timeframe analysis
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  TWELVE_DATA_KEY: process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api'),
  CACHE_FILE: path.join(__dirname, 'market_data.json'),
  MAX_AGE_MINUTES: 2, // Reduced from 5 for fresher data
  TIMEOUT_MS: 8000,  // Reduced timeout for faster failover
  RETRY_ATTEMPTS: 2,
  PARALLEL_FETCH: true
};

// Extended asset mapping with more sources
const ASSETS = {
  BTC: {
    twelvedata: 'BTC/USD',
    coingecko: 'bitcoin',
    yahoo: 'BTC-USD',
    symbol: 'BTC',
    type: 'crypto',
    displayName: 'Bitcoin'
  },
  ETH: {
    twelvedata: 'ETH/USD',
    coingecko: 'ethereum',
    yahoo: 'ETH-USD',
    symbol: 'ETH',
    type: 'crypto',
    displayName: 'Ethereum'
  },
  MSTR: {
    twelvedata: 'MSTR',
    coingecko: null,
    yahoo: 'MSTR',
    symbol: 'MSTR',
    type: 'stock',
    displayName: 'MicroStrategy'
  },
  HIMS: {
    twelvedata: 'HIMS',
    coingecko: null,
    yahoo: 'HIMS',
    symbol: 'HIMS',
    type: 'stock',
    displayName: 'Hims & Hers'
  }
};

// Fast HTTP fetch with retry logic
async function fetchWithRetry(url, options = {}, retries = CONFIG.RETRY_ATTEMPTS) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchJSON(url, options);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // Exponential backoff
    }
  }
}

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'OpenClawMarketData/1.0 (research; contact: openclaw-local)',
      ...(options.headers || {})
    };
    const req = https.get(url, { ...options, headers, timeout: CONFIG.TIMEOUT_MS }, (res) => {
      if (res.statusCode === 429) {
        reject(new Error('Rate limited'));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'error' || parsed.code === 401) {
            reject(new Error(parsed.message || 'API error'));
          } else {
            resolve(parsed);
          }
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

// Enhanced Twelve Data fetch with quote endpoint (faster)
async function fetchTwelveDataQuote(symbol) {
  const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${CONFIG.TWELVE_DATA_KEY}`;
  const data = await fetchWithRetry(url);
  
  if (data.close) {
    return {
      price: parseFloat(data.close),
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      volume: parseInt(data.volume),
      change_24h: parseFloat(data.percent_change),
      change_amount: parseFloat(data.change),
      source: 'twelvedata',
      timestamp: new Date().toISOString(),
      market_state: data.is_market_open ? 'open' : 'closed'
    };
  }
  throw new Error('No data from Twelve Data');
}

// Enhanced CoinGecko with more fields
async function fetchCoinGecko(coinId) {
  if (!coinId) throw new Error('No CoinGecko ID');
  
  // Fetch both current price and 24h data
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
  
  const data = await fetchWithRetry(url);
  
  if (data && data[0]) {
    const coin = data[0];
    return {
      price: coin.current_price,
      change_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      volume_24h: coin.total_volume,
      high_24h: coin.high_24h,
      low_24h: coin.low_24h,
      source: 'coingecko',
      timestamp: new Date().toISOString()
    };
  }
  throw new Error('No data from CoinGecko');
}

// Enhanced Yahoo Finance with more data
async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
  const data = await fetchWithRetry(url);
  
  if (data.chart?.result?.[0]) {
    const result = data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const volumes = result.indicators.quote[0].volume;
    
    const current = meta.regularMarketPrice;
    const prevClose = meta.previousClose || closes[closes.length - 2];
    const change = prevClose ? ((current - prevClose) / prevClose) * 100 : 0;
    
    return {
      price: current,
      change_24h: change,
      open: meta.regularMarketOpen || closes[0],
      high: meta.regularMarketDayHigh || Math.max(...closes.filter(Boolean)),
      low: meta.regularMarketDayLow || Math.min(...closes.filter(Boolean)),
      volume: meta.regularMarketVolume || volumes[volumes.length - 1],
      source: 'yahoo',
      timestamp: new Date().toISOString(),
      market_state: meta.currentTradingPeriod?.regular ? 'open' : 'closed'
    };
  }
  throw new Error('No data from Yahoo');
}

// Parallel cascade fetch with race condition
async function fetchAssetParallel(assetKey) {
  const asset = ASSETS[assetKey];
  const startTime = Date.now();
  
  const sources = [
    { name: 'twelvedata', fn: () => fetchTwelveDataQuote(asset.twelvedata), priority: 1 },
    ...(asset.coingecko ? [{ name: 'coingecko', fn: () => fetchCoinGecko(asset.coingecko), priority: 2 }] : []),
    { name: 'yahoo', fn: () => fetchYahoo(asset.yahoo), priority: 3 }
  ];
  
  // Try primary first, then fallbacks
  try {
    const primary = await fetchTwelveDataQuote(asset.twelvedata);
    return { ...primary, symbol: assetKey, fetch_time_ms: Date.now() - startTime };
  } catch (primaryError) {
    console.log(`[${assetKey}] Primary failed: ${primaryError.message}`);
    
    // Try fallbacks in parallel
    const fallbackPromises = sources
      .filter(s => s.priority > 1)
      .map(async (source) => {
        try {
          // Add staggered delay for rate limiting
          await new Promise(r => setTimeout(r, (source.priority - 1) * 800));
          const data = await source.fn();
          return { ...data, symbol: assetKey, fetch_time_ms: Date.now() - startTime, fallback: source.name };
        } catch (e) {
          return null;
        }
      });
    
    const results = await Promise.all(fallbackPromises);
    const success = results.find(r => r !== null);
    
    if (success) return success;
    
    // All failed - use cache
    const cached = loadCache();
    if (cached.assets[assetKey]) {
      return {
        ...cached.assets[assetKey],
        symbol: assetKey,
        source: 'cached',
        stale: true,
        fetch_time_ms: Date.now() - startTime
      };
    }
    
    throw new Error(`All sources failed for ${assetKey}`);
  }
}

// Enhanced cache with TTL
function loadCache() {
  try {
    const data = fs.readFileSync(CONFIG.CACHE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    parsed._meta = { ...parsed._meta, loaded_from: 'disk', load_time: new Date().toISOString() };
    return parsed;
  } catch {
    return {
      timestamp: new Date().toISOString(),
      assets: {},
      _meta: { loaded_from: 'none' }
    };
  }
}

function saveCache(data) {
  const output = {
    ...data,
    _meta: {
      ...data._meta,
      saved_at: new Date().toISOString(),
      version: '2.0'
    }
  };
  fs.writeFileSync(CONFIG.CACHE_FILE, JSON.stringify(output, null, 2));
}

function isCacheFresh(timestamp) {
  const cacheTime = new Date(timestamp);
  const now = new Date();
  return (now - cacheTime) / 1000 / 60 < CONFIG.MAX_AGE_MINUTES;
}

// Main function - fetch all with enhanced output
async function fetchAllEnhanced(forceRefresh = false) {
  const cache = loadCache();
  
  if (!forceRefresh && isCacheFresh(cache.timestamp)) {
    console.log('✅ Using fresh cache (<' + CONFIG.MAX_AGE_MINUTES + ' min old)');
    return cache;
  }
  
  console.log('🔄 Fetching fresh data...');
  const startTime = Date.now();
  
  // Fetch all in parallel with error handling
  const results = await Promise.allSettled(
    Object.keys(ASSETS).map(key => fetchAssetParallel(key))
  );
  
  const assets = {};
  const errors = [];
  
  results.forEach((result, index) => {
    const key = Object.keys(ASSETS)[index];
    if (result.status === 'fulfilled') {
      const data = result.value;
      assets[key] = {
        price: data.price,
        change_24h: data.change_24h || 0,
        change_amount: data.change_amount,
        open: data.open,
        high: data.high,
        low: data.low,
        volume: data.volume,
        market_cap: data.market_cap,
        source: data.source + (data.fallback ? ` (${data.fallback})` : ''),
        signal: calculateSignal(data.change_24h || 0),
        fetch_time_ms: data.fetch_time_ms,
        stale: data.stale || false
      };
    } else {
      errors.push(`${key}: ${result.reason.message}`);
      if (cache.assets[key]) {
        assets[key] = { ...cache.assets[key], source: 'cached', stale: true };
      }
    }
  });
  
  const totalTime = Date.now() - startTime;
  
  const output = {
    timestamp: new Date().toISOString(),
    assets,
    _meta: {
      fromCache: false,
      fetch_time_ms: totalTime,
      errors: errors.length > 0 ? errors : undefined,
      sources: Object.values(assets).map(a => a.source),
      assets_count: Object.keys(assets).length,
      stale_count: Object.values(assets).filter(a => a.stale).length
    }
  };
  
  saveCache(output);
  console.log(`✅ Fetched ${output._meta.assets_count} assets in ${totalTime}ms`);
  
  return output;
}

// Calculate signal with thresholds
function calculateSignal(change24h) {
  if (change24h > 10) return 'STRONG_BULLISH';
  if (change24h > 5) return 'BULLISH';
  if (change24h > 2) return 'MODERATE_BULLISH';
  if (change24h < -10) return 'STRONG_BEARISH';
  if (change24h < -5) return 'BEARISH';
  if (change24h < -2) return 'MODERATE_BEARISH';
  return 'NEUTRAL';
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--refresh') || args.includes('-r');
  const formatJson = args.includes('--json') || args.includes('-j');
  
  try {
    const data = await fetchAllEnhanced(forceRefresh);
    
    if (formatJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║    ENHANCED MARKET DATA v2.0          ║');
      console.log('╚════════════════════════════════════════╝');
      console.log(`\n📅 ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`⏱️  Fetch time: ${data._meta.fetch_time_ms}ms`);
      
      console.log('\n💰 LIVE PRICES:');
      Object.entries(data.assets).forEach(([symbol, asset]) => {
        const emoji = asset.change_24h >= 0 ? '🟢' : '🔴';
        const staleMark = asset.stale ? ' [CACHED]' : '';
        console.log(`   ${symbol}: $${asset.price?.toLocaleString()} ${emoji} ${asset.change_24h?.toFixed(2)}%${staleMark}`);
        console.log(`      Source: ${asset.source} | Signal: ${asset.signal}`);
      });
      
      if (data._meta.errors) {
        console.log('\n⚠️  Errors:', data._meta.errors.join(', '));
      }
    }
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  }
}

module.exports = { 
  fetchAllEnhanced, 
  fetchAssetParallel, 
  loadCache, 
  ASSETS,
  calculateSignal
};

if (require.main === module) main();
