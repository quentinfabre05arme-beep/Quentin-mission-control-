/**
 * TECHNICAL ANALYSIS MODULE
 * Fetches RSI, MACD, SMA, Bollinger Bands from Twelve Data
 * Provides trading signals and trend analysis
 */

const https = require('https');
const fs = require('fs');

const API_KEY = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');

// Asset mapping for Twelve Data
const SYMBOLS = {
  'BTC': 'BTC/USD',
  'ETH': 'ETH/USD', 
  'MSTR': 'MSTR',
  'HIMS': 'HIMS'
};

// Fetch JSON from API
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Fetch technical indicators
async function fetchTA(symbol, indicator, params = {}) {
  const query = new URLSearchParams({ 
    symbol, 
    apikey: API_KEY,
    interval: '1day',
    ...params 
  });
  const url = `https://api.twelvedata.com/${indicator}?${query}`;
  return fetchJSON(url);
}

// Get full TA suite for an asset
async function analyzeAsset(assetKey) {
  const symbol = SYMBOLS[assetKey];
  if (!symbol) throw new Error(`Unknown asset: ${assetKey}`);
  
  console.log(`\n🔍 Analyzing ${assetKey}...`);
  
  // Fetch all indicators in parallel
  const [rsi, macd, sma20, sma50, bbands, ema] = await Promise.all([
    fetchTA(symbol, 'rsi', { time_period: 14 }),
    fetchTA(symbol, 'macd', { fast_period: 12, slow_period: 26, signal_period: 9 }),
    fetchTA(symbol, 'sma', { time_period: 20 }),
    fetchTA(symbol, 'sma', { time_period: 50 }),
    fetchTA(symbol, 'bbands', { time_period: 20, sd: 2 }),
    fetchTA(symbol, 'ema', { time_period: 12 })
  ]);
  
  // Extract latest values
  const latestRSI = rsi.values?.[rsi.values.length - 1]?.rsi;
  const latestMACD = macd.values?.[macd.values.length - 1];
  const latestSMA20 = sma20.values?.[sma20.values.length - 1]?.sma;
  const latestSMA50 = sma50.values?.[sma50.values.length - 1]?.sma;
  const latestBB = bbands.values?.[bbands.values.length - 1];
  const latestEMA = ema.values?.[ema.values.length - 1]?.ema;
  
  // Generate signals
  const signals = {
    rsi: interpretRSI(parseFloat(latestRSI)),
    macd: interpretMACD(latestMACD),
    trend: interpretTrend(latestSMA20, latestSMA50),
    bb: interpretBB(latestBB)
  };
  
  return {
    asset: assetKey,
    symbol,
    timestamp: new Date().toISOString(),
    indicators: {
      rsi: { value: latestRSI, signal: signals.rsi },
      macd: { ...latestMACD, signal: signals.macd },
      sma20: latestSMA20,
      sma50: latestSMA50,
      ema12: latestEMA,
      bbands: { ...latestBB, signal: signals.bb }
    },
    composite: {
      trend: signals.trend,
      overallSignal: calculateOverallSignal(signals),
      confidence: calculateConfidence(signals)
    }
  };
}

// RSI interpretation
function interpretRSI(rsi) {
  if (rsi > 70) return { rating: 'OVERBOUGHT', action: 'SELL', strength: -2 };
  if (rsi > 60) return { rating: 'BULLISH', action: 'HOLD', strength: 1 };
  if (rsi > 40) return { rating: 'NEUTRAL', action: 'HOLD', strength: 0 };
  if (rsi > 30) return { rating: 'BEARISH', action: 'HOLD', strength: -1 };
  return { rating: 'OVERSOLD', action: 'BUY', strength: 2 };
}

// MACD interpretation
function interpretMACD(macd) {
  if (!macd) return { rating: 'UNKNOWN', action: 'HOLD', strength: 0 };
  const histogram = parseFloat(macd.macd) - parseFloat(macd.signal);
  if (histogram > 0 && parseFloat(macd.macd) > 0) return { rating: 'BULLISH CROSS', action: 'BUY', strength: 2 };
  if (histogram > 0) return { rating: 'BULLISH', action: 'HOLD', strength: 1 };
  if (histogram < 0 && parseFloat(macd.macd) < 0) return { rating: 'BEARISH CROSS', action: 'SELL', strength: -2 };
  return { rating: 'BEARISH', action: 'HOLD', strength: -1 };
}

// Trend interpretation (SMA)
function interpretTrend(sma20, sma50) {
  if (!sma20 || !sma50) return 'UNKNOWN';
  const s20 = parseFloat(sma20);
  const s50 = parseFloat(sma50);
  if (s20 > s50 * 1.05) return 'STRONG UPTREND';
  if (s20 > s50) return 'UPTREND';
  if (s20 < s50 * 0.95) return 'STRONG DOWNTREND';
  if (s20 < s50) return 'DOWNTREND';
  return 'SIDEWAYS';
}

// Bollinger Bands interpretation
function interpretBB(bb) {
  if (!bb) return { rating: 'UNKNOWN', position: 'unknown' };
  const upper = parseFloat(bb.upper_band);
  const lower = parseFloat(bb.lower_band);
  const middle = parseFloat(bb.middle_band);
  const width = ((upper - lower) / middle) * 100;
  
  return {
    rating: width > 5 ? 'HIGH VOLATILITY' : 'LOW VOLATILITY',
    width: width.toFixed(2) + '%',
    position: 'neutral'
  };
}

// Calculate composite signal
function calculateOverallSignal(signals) {
  const strength = signals.rsi.strength + signals.macd.strength;
  if (strength >= 3) return 'STRONG BUY';
  if (strength >= 1) return 'BUY';
  if (strength <= -3) return 'STRONG SELL';
  if (strength <= -1) return 'SELL';
  return 'HOLD';
}

// Calculate confidence
function calculateConfidence(signals) {
  const agreements = [
    signals.rsi.strength > 0,
    signals.macd.strength > 0
  ].filter(Boolean).length;
  
  if (agreements === 2) return 'HIGH';
  if (agreements === 1) return 'MEDIUM';
  return 'LOW';
}

// Format output
function formatAnalysis(analysis) {
  const i = analysis.indicators;
  const c = analysis.composite;
  
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  TECHNICAL ANALYSIS: ${analysis.asset.padEnd(12)} ║`);
  console.log(`╚════════════════════════════════════════════╝`);
  console.log(`\n📅 ${new Date(analysis.timestamp).toLocaleString()}`);
  
  console.log(`\n📊 INDICATORS:`);
  console.log(`   RSI (14): ${i.rsi.value} → ${i.rsi.signal.rating}`);
  console.log(`   MACD: ${i.macd.macd?.substring(0,6)} | Signal: ${i.macd.signal?.substring(0,6)} → ${i.macd.signal.rating}`);
  console.log(`   SMA 20: $${parseFloat(i.sma20).toFixed(2)}`);
  console.log(`   SMA 50: $${parseFloat(i.sma50).toFixed(2)}`);
  console.log(`   BB Width: ${i.bbands.width}`);
  
  console.log(`\n🎯 SIGNALS:`);
  console.log(`   Trend: ${c.trend}`);
  console.log(`   Overall: ${c.overallSignal} (${c.confidence} confidence)`);
  
  console.log(`\n💡 INTERPRETATION:`);
  console.log(`   ${getInterpretation(c.overallSignal, c.trend)}`);
}

function getInterpretation(signal, trend) {
  const interpretations = {
    'STRONG BUY': 'Multiple bullish signals align. Consider entering position.',
    'BUY': 'Bullish momentum building. Good entry opportunity.',
    'HOLD': 'Mixed signals. Wait for clearer direction.',
    'SELL': 'Bearish momentum building. Consider reducing exposure.',
    'STRONG SELL': 'Multiple bearish signals. Consider exiting position.'
  };
  return interpretations[signal] || 'Monitor closely.';
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const asset = args[0]?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'text';
  
  try {
    const analysis = await analyzeAsset(asset);
    
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

module.exports = { analyzeAsset, formatAnalysis };

if (require.main === module) main();
