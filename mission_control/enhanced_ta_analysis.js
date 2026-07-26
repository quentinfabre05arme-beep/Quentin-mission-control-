/**
 * ENHANCED TECHNICAL ANALYSIS v2.0
 * More indicators, better accuracy, multiple timeframes
 * Indicators: RSI, MACD, SMA/EMA, Bollinger, Stochastic, ATR, Volume
 */

const https = require('https');

const API_KEY = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');

const ASSETS = {
  'BTC': { symbol: 'BTC/USD', name: 'Bitcoin', type: 'crypto' },
  'ETH': { symbol: 'ETH/USD', name: 'Ethereum', type: 'crypto' },
  'MSTR': { symbol: 'MSTR', name: 'MicroStrategy', type: 'stock' },
  'HIMS': { symbol: 'HIMS', name: 'Hims & Hers', type: 'stock' }
};

// Fetch with retry logic
async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchJSON(url);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 429) {
        reject(new Error('Rate limited - try later'));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'error') reject(new Error(parsed.message));
          else resolve(parsed);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Fetch technical indicator
async function fetchIndicator(symbol, indicator, params = {}) {
  const query = new URLSearchParams({
    symbol,
    apikey: API_KEY,
    interval: '1day',
    ...params
  });
  const url = `https://api.twelvedata.com/${indicator}?${query}`;
  return fetchWithRetry(url);
}

// Enhanced TA analysis
async function analyzeEnhanced(assetKey) {
  const asset = ASSETS[assetKey];
  if (!asset) throw new Error(`Unknown asset: ${assetKey}`);
  
  console.log(`\n🔍 Analyzing ${asset.name}...`);
  const startTime = Date.now();
  
  // Fetch all indicators in parallel
  const results = await Promise.allSettled([
    fetchIndicator(asset.symbol, 'rsi', { time_period: 14 }),
    fetchIndicator(asset.symbol, 'rsi', { time_period: 7 }), // Fast RSI
    fetchIndicator(asset.symbol, 'macd', { fast_period: 12, slow_period: 26, signal_period: 9 }),
    fetchIndicator(asset.symbol, 'sma', { time_period: 20 }),
    fetchIndicator(asset.symbol, 'sma', { time_period: 50 }),
    fetchIndicator(asset.symbol, 'sma', { time_period: 200 }), // Long term trend
    fetchIndicator(asset.symbol, 'ema', { time_period: 12 }),
    fetchIndicator(asset.symbol, 'ema', { time_period: 26 }),
    fetchIndicator(asset.symbol, 'bbands', { time_period: 20, sd: 2 }),
    fetchIndicator(asset.symbol, 'stochastic', { time_period: 14, d_period: 3 }),
    fetchIndicator(asset.symbol, 'atr', { time_period: 14 })
  ]);
  
  const [
    rsi14, rsi7, macd, sma20, sma50, sma200, ema12, ema26, bbands, stochastic, atr
  ] = results.map(r => r.status === 'fulfilled' ? r.value : null);
  
  // Extract latest values
  const getLast = (data, key) => data?.values?.[data.values.length - 1]?.[key];
  const getValue = (data) => data?.values?.[data.values.length - 1];
  
  const indicators = {
    rsi14: { value: parseFloat(getLast(rsi14, 'rsi')) || null },
    rsi7: { value: parseFloat(getLast(rsi7, 'rsi')) || null },
    macd: getValue(macd),
    sma20: { value: parseFloat(getLast(sma20, 'sma')) || null },
    sma50: { value: parseFloat(getLast(sma50, 'sma')) || null },
    sma200: { value: parseFloat(getLast(sma200, 'sma')) || null },
    ema12: { value: parseFloat(getLast(ema12, 'ema')) || null },
    ema26: { value: parseFloat(getLast(ema26, 'ema')) || null },
    bbands: getValue(bbands),
    stochastic: getValue(stochastic),
    atr: { value: parseFloat(getLast(atr, 'atr')) || null }
  };
  
  // Calculate derived signals
  const signals = {
    rsi: analyzeRSI(indicators.rsi14.value, indicators.rsi7.value),
    macd: analyzeMACD(indicators.macd),
    trend: analyzeTrend(indicators.sma20.value, indicators.sma50.value, indicators.sma200.value, indicators.ema12.value, indicators.ema26.value),
    volatility: analyzeVolatility(indicators.bbands, indicators.atr.value),
    momentum: analyzeStochastic(indicators.stochastic),
    supportResistance: calculateSR(indicators.sma20.value, indicators.sma50.value, indicators.bbands)
  };
  
  // Generate composite score
  const composite = calculateCompositeScore(signals, asset.type);
  
  const analysisTime = Date.now() - startTime;
  
  return {
    asset: assetKey,
    name: asset.name,
    type: asset.type,
    timestamp: new Date().toISOString(),
    analysis_time_ms: analysisTime,
    indicators,
    signals,
    composite
  };
}

// RSI Analysis with divergence detection
function analyzeRSI(rsi14, rsi7) {
  if (!rsi14) return { rating: 'UNKNOWN', action: 'HOLD', strength: 0 };
  
  let rating, action, strength;
  
  if (rsi14 > 70) { rating = 'OVERBOUGHT'; action = 'SELL'; strength = -3; }
  else if (rsi14 > 60) { rating = 'BULLISH'; action = 'HOLD'; strength = 1; }
  else if (rsi14 > 40) { rating = 'NEUTRAL'; action = 'HOLD'; strength = 0; }
  else if (rsi14 > 30) { rating = 'BEARISH'; action = 'HOLD'; strength = -1; }
  else { rating = 'OVERSOLD'; action = 'BUY'; strength = 3; }
  
  // Fast RSI divergence
  let divergence = 'none';
  if (rsi7 && rsi14) {
    if (rsi7 > rsi14 + 5) divergence = 'bullish';
    else if (rsi7 < rsi14 - 5) divergence = 'bearish';
  }
  
  return { rating, action, strength, value: rsi14, fastRsi: rsi7, divergence };
}

// MACD with histogram analysis
function analyzeMACD(macdData) {
  if (!macdData) return { rating: 'UNKNOWN', action: 'HOLD', strength: 0 };
  
  const macd = parseFloat(macdData.macd);
  const signal = parseFloat(macdData.signal);
  const hist = parseFloat(macdData.macd_hist);
  
  let rating, action, strength;
  
  if (macd > signal && hist > 0) {
    rating = hist > macd * 0.1 ? 'BULLISH CROSS' : 'WEAK BULLISH';
    action = 'BUY';
    strength = 2;
  } else if (macd > signal) {
    rating = 'BULLISH';
    action = 'HOLD';
    strength = 1;
  } else if (macd < signal && hist < 0) {
    rating = hist < macd * 0.1 ? 'BEARISH CROSS' : 'WEAK BEARISH';
    action = 'SELL';
    strength = -2;
  } else {
    rating = 'BEARISH';
    action = 'HOLD';
    strength = -1;
  }
  
  return { rating, action, strength, macd, signal, histogram: hist };
}

// Multi-timeframe trend analysis
function analyzeTrend(sma20, sma50, sma200, ema12, ema26) {
  if (!sma20 || !sma50) return { trend: 'UNKNOWN', strength: 0 };
  
  const shortTrend = sma20 > sma50 ? 'uptrend' : 'downtrend';
  const emaCross = ema12 && ema26 ? (ema12 > ema26 ? 'bullish' : 'bearish') : 'neutral';
  
  let trend, strength;
  
  if (sma20 > sma50 * 1.05) {
    trend = 'STRONG_UPTREND';
    strength = 3;
  } else if (sma20 > sma50) {
    trend = 'UPTREND';
    strength = 2;
  } else if (sma20 < sma50 * 0.95) {
    trend = 'STRONG_DOWNTREND';
    strength = -3;
  } else if (sma20 < sma50) {
    trend = 'DOWNTREND';
    strength = -2;
  } else {
    trend = 'SIDEWAYS';
    strength = 0;
  }
  
  // Long term context
  let longTerm = 'neutral';
  if (sma200) {
    if (sma50 > sma200) longTerm = 'bullish';
    else if (sma50 < sma200) longTerm = 'bearish';
  }
  
  return { trend, strength, shortTrend, emaCross, longTerm };
}

// Volatility analysis
function analyzeVolatility(bbands, atr) {
  if (!bbands) return { rating: 'UNKNOWN', width: 0, position: 'unknown' };
  
  const upper = parseFloat(bbands.upper_band);
  const lower = parseFloat(bbands.lower_band);
  const middle = parseFloat(bbands.middle_band);
  
  if (!upper || !lower || !middle) return { rating: 'UNKNOWN', width: 0, position: 'unknown' };
  
  const width = ((upper - lower) / middle) * 100;
  
  let rating;
  if (width > 10) rating = 'HIGH_VOLATILITY';
  else if (width > 5) rating = 'MODERATE_VOLATILITY';
  else rating = 'LOW_VOLATILITY';
  
  return { rating, width: width.toFixed(2) + '%', upper, lower, middle, atr };
}

// Stochastic oscillator
function analyzeStochastic(stoch) {
  if (!stoch) return { rating: 'UNKNOWN', k: null, d: null };
  
  const k = parseFloat(stoch.slowk || stoch.fastk);
  const d = parseFloat(stoch.slowd || stoch.fastd);
  
  if (!k || !d) return { rating: 'UNKNOWN', k, d };
  
  let rating, action;
  if (k > 80 && d > 80) { rating = 'OVERBOUGHT'; action = 'SELL'; }
  else if (k < 20 && d < 20) { rating = 'OVERSOLD'; action = 'BUY'; }
  else if (k > d) { rating = 'BULLISH'; action = 'HOLD'; }
  else { rating = 'BEARISH'; action = 'HOLD'; }
  
  return { rating, action, k: k.toFixed(2), d: d.toFixed(2) };
}

// Support/Resistance levels
function calculateSR(sma20, sma50, bbands) {
  const levels = [];
  if (sma20) levels.push({ level: sma20, type: 'support', strength: 'medium' });
  if (sma50) levels.push({ level: sma50, type: 'resistance', strength: 'strong' });
  if (bbands) {
    levels.push({ level: parseFloat(bbands.lower_band), type: 'support', strength: 'strong' });
    levels.push({ level: parseFloat(bbands.upper_band), type: 'resistance', strength: 'strong' });
  }
  return levels.sort((a, b) => a.level - b.level);
}

// Composite scoring
function calculateCompositeScore(signals, type) {
  let score = 0;
  const factors = [];
  
  // RSI contribution
  score += signals.rsi?.strength || 0;
  if (signals.rsi?.strength) factors.push(`RSI: ${signals.rsi.rating}`);
  
  // MACD contribution
  score += signals.macd?.strength || 0;
  if (signals.macd?.strength) factors.push(`MACD: ${signals.macd.rating}`);
  
  // Trend contribution
  score += signals.trend?.strength || 0;
  if (signals.trend?.strength) factors.push(`Trend: ${signals.trend.trend}`);
  
  // Momentum
  if (signals.momentum?.action === 'BUY') { score += 1; factors.push('Momentum: Bullish'); }
  else if (signals.momentum?.action === 'SELL') { score -= 1; factors.push('Momentum: Bearish'); }
  
  // Normalize for crypto (more volatile)
  if (type === 'crypto') score = score * 1.2;
  
  // Determine rating
  let rating;
  if (score >= 5) rating = 'STRONG_BUY';
  else if (score >= 3) rating = 'BUY';
  else if (score >= 1) rating = 'WEAK_BUY';
  else if (score <= -5) rating = 'STRONG_SELL';
  else if (score <= -3) rating = 'SELL';
  else if (score <= -1) rating = 'WEAK_SELL';
  else rating = 'HOLD';
  
  // Calculate confidence
  const validSignals = [signals.rsi, signals.macd, signals.trend].filter(s => s && s.rating !== 'UNKNOWN').length;
  const confidence = validSignals >= 3 ? 'HIGH' : validSignals >= 2 ? 'MEDIUM' : 'LOW';
  
  return { score, rating, confidence, factors };
}

// Format output
function formatAnalysis(data) {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log(`║  ENHANCED TA: ${data.name.padEnd(25)} ║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\n📅 ${new Date(data.timestamp).toLocaleString()} (${data.analysis_time_ms}ms)`);
  
  const i = data.indicators;
  const s = data.signals;
  const c = data.composite;
  
  console.log('\n📊 INDICATORS:');
  console.log(`   RSI(14): ${i.rsi14?.value?.toFixed(1) || 'N/A'} ${s.rsi?.rating}`);
  if (i.rsi7?.value) console.log(`   RSI(7):  ${i.rsi7.value.toFixed(1)} (Fast)`);
  console.log(`   MACD: ${s.macd?.rating} (Hist: ${s.macd?.histogram?.toFixed(2) || 'N/A'})`);
  console.log(`   SMA 20/50/200: $${i.sma20?.value?.toFixed(0) || 'N/A'} / $${i.sma50?.value?.toFixed(0) || 'N/A'} / $${i.sma200?.value?.toFixed(0) || 'N/A'}`);
  console.log(`   BB Width: ${s.volatility?.width || 'N/A'}`);
  console.log(`   Stoch: K=${s.momentum?.k || 'N/A'} D=${s.momentum?.d || 'N/A'}`);
  
  console.log('\n🎯 SIGNALS:');
  console.log(`   Trend: ${s.trend?.trend} (${s.trend?.emaCross} EMA)`);
  console.log(`   Volatility: ${s.volatility?.rating}`);
  console.log(`   Composite: ${c.rating} (Score: ${c.score}, ${c.confidence} confidence)`);
  
  console.log('\n💡 FACTORS:');
  c.factors.forEach(f => console.log(`   • ${f}`));
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const asset = args[0]?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'text';
  
  try {
    const analysis = await analyzeEnhanced(asset);
    
    if (format === 'json') {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      formatAnalysis(analysis);
    }
  } catch (e) {
    console.error(`❌ Analysis failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { analyzeEnhanced, formatAnalysis };

if (require.main === module) main();
