const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (e) {
  config = {};
}

function loadSecrets() {
  const secretsPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.openclaw', 'secrets.json');
  try {
    return JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  } catch (e) {
    return {};
  }
}
const SECRETS = loadSecrets();

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { timeout: 15000, ...options }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function readCache() {
  const cachePath = path.join(__dirname, '..', 'data', 'market_cache.json');
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    return { prices: {}, lastUpdated: null };
  }
}

function writeCache(cache) {
  const cachePath = path.join(__dirname, '..', 'data', 'market_cache.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

async function getTwelveDataPrice(symbol) {
  const apiKey = SECRETS.twelve_data_api || process.env.TWELVE_DATA_API;
  if (!apiKey) return null;
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const data = await fetchJson(url);
    if (data && data.close) {
      return {
        symbol,
        price: parseFloat(data.close),
        change24hPct: data.percent_change ? parseFloat(data.percent_change) : null,
        currency: data.currency || 'USD',
        source: 'twelve_data',
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function getCoinGeckoPrice(symbol) {
  const map = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', ADA: 'cardano', DOT: 'polkadot', LINK: 'chainlink' };
  const id = map[symbol.toUpperCase()];
  if (!id) return null;
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const data = await fetchJson(url);
    if (data && data[id]) {
      return {
        symbol,
        price: data[id].usd,
        change24hPct: data[id].usd_24h_change || null,
        currency: 'USD',
        source: 'coingecko',
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function getYahooPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const data = await fetchJson(url);
    if (data && data.chart && data.chart.result && data.chart.result[0]) {
      const r = data.chart.result[0];
      const price = r.meta.regularMarketPrice;
      const prev = r.meta.previousClose || r.meta.regularMarketPreviousClose;
      return {
        symbol,
        price: price,
        change24hPct: prev ? ((price - prev) / prev) * 100 : null,
        currency: r.meta.currency || 'USD',
        source: 'yahoo',
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function getPrice(symbol, typeHint = 'equity') {
  const upper = symbol.toUpperCase();
  const cache = readCache();
  const now = Date.now();
  if (cache.prices[upper] && cache.prices[upper].ts && (now - cache.prices[upper].ts) < 5 * 60 * 1000) {
    return cache.prices[upper].data;
  }
  let result = null;
  if (typeHint === 'crypto') result = await getCoinGeckoPrice(upper);
  if (!result) result = await getTwelveDataPrice(upper);
  if (!result && typeHint === 'crypto') result = await getCoinGeckoPrice(upper);
  if (!result) result = await getYahooPrice(upper);
  if (result) {
    cache.prices[upper] = { data: result, ts: now };
    writeCache(cache);
  }
  return result;
}

async function getPrices(symbols) {
  const out = {};
  for (const item of symbols) {
    const s = typeof item === 'string' ? item : item.symbol;
    const t = typeof item === 'string' ? 'equity' : (item.type || 'equity');
    try {
      out[s] = await getPrice(s, t);
    } catch (e) {
      out[s] = null;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return out;
}

module.exports = { getPrice, getPrices, fetchJson };
