/**
 * ALPHA FUND v3.0 — IBKR-Based Technical Analysis Engine
 * Fetches historical bars from IBKR and computes indicators locally.
 */

const { IBApi, EventName, Stock, BarSizeSetting, WhatToShow, DurationUnit, MarketDataType } = require('@stoqey/ib');

const IBKR_CONFIG = {
  host: '127.0.0.1',
  port: 7496,
  clientId: 50
};

let lastClientId = IBKR_CONFIG.clientId;
function getClientId() {
  lastClientId = (lastClientId % 100) + 50;
  return lastClientId;
}

// ─── FETCH HISTORICAL BARS ─────────────────────────────────
async function fetchHistoricalBars(ticker, days = 50, barSize = '1 day') {
  const ib = new IBApi({ host: IBKR_CONFIG.host, port: IBKR_CONFIG.port });
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    const bars = [];
    
    function finish() {
      if (!resolved) {
        resolved = true;
        try { ib.disconnect(); } catch(e) {}
        resolve(bars);
      }
    }
    
    ib.on(EventName.connected, () => {
      try {
        ib.reqMarketDataType(MarketDataType.DELAYED);
      } catch(e) {}
      
      const contract = new Stock(ticker, 'SMART', 'USD');
      const endDateTime = '';
      const duration = `${days} D`;
      const whatToShow = WhatToShow.TRADES;
      const useRTH = true;
      
      ib.reqHistoricalData(1, contract, endDateTime, duration, BarSizeSetting.DAYS_1, whatToShow, useRTH, false, []);
    });
    
    ib.on(EventName.historicalData, (reqId, date, open, high, low, close, volume, count, wap, hasGaps) => {
      if (date && !date.startsWith('finished')) {
        bars.push({ date, open, high, low, close, volume });
      }
      if (date && date.startsWith('finished')) {
        finish();
      }
    });
    
    ib.on(EventName.error, (err) => {
      const msg = err.message || String(err);
      if (msg.includes('delayed') || msg.includes('Historical Market Data Service')) return;
      console.error('IBKR TA Error:', msg);
      if (!resolved) {
        try { ib.disconnect(); } catch(e) {}
        reject(err);
      }
    });
    
    setTimeout(() => finish(), 15000);
    ib.connect(getClientId());
  });
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
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function bollingerBands(closes, period = 20, stdDev = 2) {
  const ma = sma(closes, period);
  if (!ma) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { middle: ma, upper: ma + stdDev * std, lower: ma - stdDev * std };
}

function macd(closes) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  if (!ema12 || !ema26) return null;
  return { line: ema12 - ema26, signal: ema( closes, 9) };
}

function atr(bars, period = 14) {
  if (bars.length < period) return null;
  const trs = [];
  for (let i = bars.length - period; i < bars.length; i++) {
    const highLow = bars[i].high - bars[i].low;
    const highClose = i > 0 ? Math.abs(bars[i].high - bars[i - 1].close) : 0;
    const lowClose = i > 0 ? Math.abs(bars[i].low - bars[i - 1].close) : 0;
    trs.push(Math.max(highLow, highClose, lowClose));
  }
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function stochastic(bars, kPeriod = 14, dPeriod = 3) {
  if (bars.length < kPeriod + dPeriod - 1) return null;
  const ks = [];
  for (let i = bars.length - kPeriod - dPeriod + 1; i <= bars.length - kPeriod; i++) {
    const slice = bars.slice(i, i + kPeriod);
    const low = Math.min(...slice.map(b => b.low));
    const high = Math.max(...slice.map(b => b.high));
    const close = bars[i + kPeriod - 1].close;
    ks.push(((close - low) / (high - low)) * 100);
  }
  const k = ks[ks.length - 1];
  const d = ks.reduce((a, b) => a + b, 0) / ks.length;
  return { k, d };
}

// ─── COMPOSITE TA ANALYSIS ─────────────────────────────────
async function analyzeTicker(ticker, currentPrice) {
  try {
    const bars = await fetchHistoricalBars(ticker, 60);
    if (!bars || bars.length < 30) {
      return fallbackMomentum(currentPrice);
    }
    
    const closes = bars.map(b => b.close);
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const change_24h = ((last - prev) / prev) * 100;
    
    const indicators = {
      rsi: rsi(closes, 14),
      rsi_short: rsi(closes, 7),
      sma_20: sma(closes, 20),
      sma_50: sma(closes, 50),
      ema_20: ema(closes, 20),
      ema_50: ema(closes, 50),
      macd: macd(closes),
      bollinger: bollingerBands(closes, 20, 2),
      atr: atr(bars, 14),
      stochastic: stochastic(bars, 14, 3),
      volume_avg: sma(bars.map(b => b.volume), 20),
      last_volume: bars[bars.length - 1].volume
    };
    
    let score = 0;
    let reasons = [];
    
    // RSI
    if (indicators.rsi < 30) { score += 1.5; reasons.push('Oversold RSI'); }
    else if (indicators.rsi > 70) { score -= 1.5; reasons.push('Overbought RSI'); }
    
    // Trend vs SMA
    if (last > indicators.sma_20 && indicators.sma_20 > indicators.sma_50) { score += 1; reasons.push('Price above SMA20/50'); }
    else if (last < indicators.sma_20 && indicators.sma_20 < indicators.sma_50) { score -= 1; reasons.push('Price below SMA20/50'); }
    
    // MACD
    if (indicators.macd && indicators.macd.line > 0) { score += 0.5; reasons.push('MACD positive'); }
    else if (indicators.macd && indicators.macd.line < 0) { score -= 0.5; }
    
    // Bollinger
    if (indicators.bollinger) {
      if (last < indicators.bollinger.lower) { score += 1; reasons.push('Below lower Bollinger Band'); }
      else if (last > indicators.bollinger.upper) { score -= 1; reasons.push('Above upper Bollinger Band'); }
    }
    
    // Momentum
    if (change_24h > 3) { score -= 0.5; reasons.push('Strong +24h momentum'); }
    else if (change_24h < -3) { score += 0.5; reasons.push('Weak -24h momentum'); }
    
    // Volume
    if (indicators.volume_avg && indicators.last_volume > indicators.volume_avg * 1.5) {
      reasons.push('High volume');
    }
    
    let rating = 'NEUTRAL';
    if (score >= 2) rating = 'BULLISH';
    else if (score <= -2) rating = 'BEARISH';
    else if (score > 0) rating = 'SLIGHTLY_BULLISH';
    else if (score < 0) rating = 'SLIGHTLY_BEARISH';
    
    return {
      asset: ticker,
      price: currentPrice,
      change_24h,
      score,
      rating,
      indicators,
      reasons,
      source: 'IBKR-TA',
      timestamp: new Date().toISOString()
    };
  } catch(e) {
    return fallbackMomentum(currentPrice);
  }
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

async function analyzeAll(prices) {
  const results = {};
  for (const [ticker, info] of Object.entries(prices)) {
    // Skip crypto for IBKR TA — use fallback
    if (['BTC', 'ETH'].includes(ticker)) {
      results[ticker] = fallbackMomentum({ ...info, asset: ticker });
      continue;
    }
    try {
      results[ticker] = await analyzeTicker(ticker, info);
    } catch(e) {
      results[ticker] = fallbackMomentum({ ...info, asset: ticker });
    }
  }
  return results;
}

if (require.main === module) {
  analyzeAll({
    AAPL: { price: 333.43, change_24h: 0 },
    TSLA: { price: 309.31, change_24h: 0 }
  }).then(r => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { analyzeTicker, analyzeAll, fetchHistoricalBars, indicators: { sma, ema, rsi, bollingerBands, macd, atr, stochastic } };
