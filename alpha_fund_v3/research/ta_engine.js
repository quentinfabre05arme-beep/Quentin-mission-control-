/**
 * ALPHA FUND v3.0 — Web-Based Technical Analysis Engine
 * Fetches historical bars from Yahoo Finance and computes indicators locally.
 * IBKR provides live snapshots; this engine provides historical context.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CACHE ─────────────────────────────────────────────────
const CACHE_DIR = path.join(__dirname, '..', 'data', 'ta_cache');
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours for historical bars
const REQUEST_DELAY_MS = 3500; // Yahoo rate limit protection
const RETRY_BASE_MS = 3000;

function getCacheFile(ticker, range, interval) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  return path.join(CACHE_DIR, `${ticker}_${range}_${interval}.json`);
}

function loadCache(ticker, range, interval) {
  const file = getCacheFile(ticker, range, interval);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - new Date(data.timestamp).getTime() > CACHE_TTL_MS) return null;
    return data.bars;
  } catch(e) { return null; }
}

function saveCache(ticker, range, interval, bars) {
  const file = getCacheFile(ticker, range, interval);
  fs.writeFileSync(file, JSON.stringify({ bars, timestamp: new Date().toISOString() }, null, 2));
}

// ─── FETCH HISTORICAL BARS FROM YAHOO ──────────────────────
async function fetchYahooBars(ticker, range = '1y', interval = '1d', retries = 3) {
  const cached = loadCache(ticker, range, interval);
  if (cached) {
    return cached;
  }
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  ];
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const bars = await new Promise((resolve, reject) => {
        const req = https.get(url, {
          headers: {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 10000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 429) {
              return reject(new Error('RATE_LIMIT'));
            }
            if (res.statusCode !== 200) {
              return reject(new Error(`HTTP ${res.statusCode}`));
            }
            try {
              const json = JSON.parse(data);
              const result = json.chart?.result?.[0];
              if (!result) return resolve([]);
              
              const timestamps = result.timestamp || [];
              const quote = result.indicators?.quote?.[0] || {};
              const closes = quote.close || [];
              const opens = quote.open || [];
              const highs = quote.high || [];
              const lows = quote.low || [];
              const volumes = quote.volume || [];
              
              const bars = [];
              for (let i = 0; i < timestamps.length; i++) {
                if (closes[i] !== null) {
                  bars.push({
                    date: new Date(timestamps[i] * 1000).toISOString(),
                    open: opens[i],
                    high: highs[i],
                    low: lows[i],
                    close: closes[i],
                    volume: volumes[i] || 0
                  });
                }
              }
              resolve(bars);
            } catch(e) { reject(e); }
          });
        }).on('error', (e) => { req.destroy(); reject(e); }).on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      
      if (bars.length >= 50) {
        saveCache(ticker, range, interval, bars);
        return bars;
      }
      throw new Error('Insufficient bars');
    } catch(e) {
      if (attempt >= retries - 1) throw e;
      const delay = RETRY_BASE_MS * Math.pow(1.5, attempt) + Math.random() * 1000;
      console.log(`   ⚠️ Yahoo ${ticker} attempt ${attempt + 1} failed (${e.message}), retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return [];
}

// ─── INDICATORS ────────────────────────────────────────────
function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function bollingerBands(closes, period = 20, stdDev = 2) {
  const ma = sma(closes, period);
  if (!ma) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period);
  return { middle: ma, upper: ma + stdDev * std, lower: ma - stdDev * std };
}

function macd(closes) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  if (!ema12 || !ema26) return null;
  
  const macdSeries = [];
  for (let i = 26; i < closes.length; i++) {
    const e12 = ema(closes.slice(0, i + 1), 12);
    const e26 = ema(closes.slice(0, i + 1), 26);
    macdSeries.push(e12 - e26);
  }
  const signal = ema(macdSeries, 9);
  const line = macdSeries[macdSeries.length - 1];
  return { line, signal, histogram: line - signal };
}

function atr(bars, period = 14) {
  if (bars.length < period) return null;
  const trs = [];
  for (let i = 1; i < bars.length; i++) {
    const highLow = bars[i].high - bars[i].low;
    const highClose = Math.abs(bars[i].high - bars[i - 1].close);
    const lowClose = Math.abs(bars[i].low - bars[i - 1].close);
    trs.push(Math.max(highLow, highClose, lowClose));
  }
  return sma(trs.slice(-period), period);
}

function stochastic(bars, kPeriod = 14, dPeriod = 3) {
  if (bars.length < kPeriod + dPeriod - 1) return null;
  const ks = [];
  for (let i = bars.length - kPeriod - dPeriod + 1; i <= bars.length - kPeriod; i++) {
    const slice = bars.slice(i, i + kPeriod);
    const low = Math.min(...slice.map(b => b.low));
    const high = Math.max(...slice.map(b => b.high));
    ks.push(((bars[i + kPeriod - 1].close - low) / (high - low)) * 100);
  }
  return { k: ks[ks.length - 1], d: sma(ks, dPeriod) };
}

// ─── COMPOSITE TA ANALYSIS ─────────────────────────────────
async function analyzeTicker(ticker, currentPrice) {
  try {
    const bars = await fetchYahooBars(ticker, '1y', '1d');
    if (!bars || bars.length < 50) {
      return fallbackMomentum({ ...currentPrice, asset: ticker });
    }
    
    const closes = bars.map(b => b.close);
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const change_24h = ((last - prev) / prev) * 100;
    
    const indicators = {
      rsi_14: rsi(closes, 14),
      rsi_7: rsi(closes, 7),
      sma_20: sma(closes, 20),
      sma_50: sma(closes, 50),
      sma_200: sma(closes, 200),
      ema_20: ema(closes, 20),
      ema_50: ema(closes, 50),
      macd: macd(closes),
      bollinger: bollingerBands(closes, 20, 2),
      atr: atr(bars, 14),
      stochastic: stochastic(bars, 14, 3),
      volume_avg_20: sma(bars.map(b => b.volume), 20),
      last_volume: bars[bars.length - 1].volume
    };
    
    let score = 0;
    let reasons = [];
    
    if (indicators.rsi_14 < 30) { score += 1.5; reasons.push('RSI oversold'); }
    else if (indicators.rsi_14 > 70) { score -= 1.5; reasons.push('RSI overbought'); }
    
    if (last > indicators.sma_20 && indicators.sma_20 > indicators.sma_50) {
      score += 1; reasons.push('Price > SMA20 > SMA50');
    } else if (last < indicators.sma_20 && indicators.sma_20 < indicators.sma_50) {
      score -= 1; reasons.push('Price < SMA20 < SMA50');
    }
    
    if (indicators.sma_50 && indicators.sma_200) {
      if (indicators.sma_50 > indicators.sma_200) { score += 0.5; reasons.push('Golden cross'); }
      else { score -= 0.5; reasons.push('Death cross'); }
    }
    
    if (indicators.macd) {
      if (indicators.macd.histogram > 0) { score += 0.5; reasons.push('MACD bullish'); }
      else { score -= 0.5; }
    }
    
    if (indicators.bollinger) {
      if (last < indicators.bollinger.lower) { score += 1; reasons.push('Below lower Bollinger'); }
      else if (last > indicators.bollinger.upper) { score -= 1; reasons.push('Above upper Bollinger'); }
    }
    
    if (change_24h > 3) { score -= 0.5; reasons.push('Strong +24h move'); }
    else if (change_24h < -3) { score += 0.5; reasons.push('Weak -24h move'); }
    
    if (indicators.volume_avg_20 && indicators.last_volume > indicators.volume_avg_20 * 1.5) {
      reasons.push('Above-average volume');
    }
    
    let rating = 'NEUTRAL';
    if (score >= 2.5) rating = 'BULLISH';
    else if (score <= -2.5) rating = 'BEARISH';
    else if (score > 0) rating = 'SLIGHTLY_BULLISH';
    else if (score < 0) rating = 'SLIGHTLY_BEARISH';
    
    return {
      asset: ticker,
      price: currentPrice.price,
      change_24h,
      score,
      rating,
      indicators: cleanIndicators(indicators),
      reasons,
      source: 'YAHOO-TA',
      timestamp: new Date().toISOString()
    };
  } catch(e) {
    return fallbackMomentum({ ...currentPrice, asset: ticker });
  }
}

function cleanIndicators(indicators) {
  const cleaned = {};
  for (const [k, v] of Object.entries(indicators)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'number') cleaned[k] = Math.round(v * 100) / 100;
    else cleaned[k] = v;
  }
  return cleaned;
}

function fallbackMomentum(currentPrice) {
  const change = currentPrice.change_24h || 0;
  let score = 0;
  if (change > 3) score += 1;
  else if (change < -3) score -= 1;
  return {
    asset: currentPrice.asset || 'UNKNOWN',
    price: currentPrice.price,
    change_24h: change,
    score,
    rating: score > 0 ? 'SLIGHTLY_BULLISH' : score < 0 ? 'SLIGHTLY_BEARISH' : 'NEUTRAL',
    indicators: {},
    reasons: ['Momentum fallback'],
    source: 'momentum',
    timestamp: new Date().toISOString()
  };
}

async function analyzeAll(prices, timeoutMs = 12000) {
  const results = {};
  const tickers = Object.entries(prices);
  
  for (let i = 0; i < tickers.length; i++) {
    const [ticker, info] = tickers[i];
    try {
      const analysis = await Promise.race([
        analyzeTicker(ticker, info),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TA timeout')), timeoutMs))
      ]);
      results[ticker] = analysis;
      if (i < tickers.length - 1) {
        await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
      }
    } catch(e) {
      console.log(`   ⚠️ TA failed/skip ${ticker}: ${e.message}`);
      results[ticker] = fallbackMomentum({ ...info, asset: ticker });
    }
  }
  return results;
}

if (require.main === module) {
  analyzeAll({
    AAPL: { price: 333.43, change_24h: 0 },
    TSLA: { price: 309.31, change_24h: 0 },
    BTC: { price: 63055, change_24h: 0 }
  }).then(r => {
    Object.entries(r).forEach(([k, v]) => {
      console.log(k, v.rating, v.score, v.reasons.join(', '), JSON.stringify(v.indicators));
    });
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { analyzeTicker, analyzeAll, fetchYahooBars, indicators: { sma, ema, rsi, bollingerBands, macd, atr, stochastic } };
