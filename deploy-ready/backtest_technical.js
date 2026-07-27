/**
 * TECHNICAL-ONLY BACKTEST
 * Tests enhanced TA signals on historical price data
 * Limitation: No sentiment (not available historically)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');

const ASSETS = {
  'BTC': { symbol: 'BTC/USD', name: 'Bitcoin' },
  'ETH': { symbol: 'ETH/USD', name: 'Ethereum' },
  'MSTR': { symbol: 'MSTR', name: 'MicroStrategy' },
  'HIMS': { symbol: 'HIMS', name: 'Hims & Hers' }
};

// Fetch historical prices from Twelve Data
async function fetchHistoricalPrices(symbol, days = 90) {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${days}&apikey=${API_KEY}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'error') reject(new Error(parsed.message));
          else resolve(parsed.values || []);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Calculate technical indicators from price history
function calculateIndicators(prices) {
  const closes = prices.map(p => parseFloat(p.close)).reverse(); // Oldest first
  const highs = prices.map(p => parseFloat(p.high)).reverse();
  const lows = prices.map(p => parseFloat(p.low)).reverse();
  
  const indicators = [];
  
  for (let i = 50; i < closes.length; i++) {
    const slice = closes.slice(0, i + 1);
    const highSlice = highs.slice(0, i + 1);
    const lowSlice = lows.slice(0, i + 1);
    
    // SMA calculations
    const sma20 = calculateSMA(slice, 20);
    const sma50 = calculateSMA(slice, 50);
    
    // RSI
    const rsi14 = calculateRSI(slice, 14);
    
    // MACD (simplified)
    const ema12 = calculateEMA(slice, 12);
    const ema26 = calculateEMA(slice, 26);
    const macd = ema12 - ema26;
    
    // Price vs SMA
    const price = slice[slice.length - 1];
    const prevPrice = slice[slice.length - 2];
    const change = ((price - prevPrice) / prevPrice) * 100;
    
    // Signal generation (technical-only)
    let signal = 'HOLD';
    let score = 0;
    
    // RSI signals
    if (rsi14 < 30) { signal = 'BUY'; score += 2; }
    else if (rsi14 > 70) { signal = 'SELL'; score -= 2; }
    else if (rsi14 < 40) { signal = 'WEAK_BUY'; score += 1; }
    else if (rsi14 > 60) { signal = 'WEAK_SELL'; score -= 1; }
    
    // Trend signals
    if (sma20 && sma50) {
      if (sma20 > sma50 * 1.02) { score += 1; }
      else if (sma20 < sma50 * 0.98) { score -= 1; }
    }
    
    // MACD
    if (macd > 0 && (slice[slice.length - 2] - calculateEMA(slice.slice(0, -1), 12)) < 0) {
      score += 1; // MACD cross up
    } else if (macd < 0 && (slice[slice.length - 2] - calculateEMA(slice.slice(0, -1), 12)) > 0) {
      score -= 1; // MACD cross down
    }
    
    // Final signal
    if (score >= 3) signal = 'STRONG_BUY';
    else if (score >= 2) signal = 'BUY';
    else if (score >= 1) signal = 'WEAK_BUY';
    else if (score <= -3) signal = 'STRONG_SELL';
    else if (score <= -2) signal = 'SELL';
    else if (score <= -1) signal = 'WEAK_SELL';
    
    indicators.push({
      date: prices[prices.length - 1 - i].datetime,
      price,
      change,
      rsi14,
      sma20,
      sma50,
      macd,
      signal,
      score
    });
  }
  
  return indicators;
}

function calculateSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = calculateSMA(data.slice(0, period), period);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(data, period) {
  if (data.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Backtest the signals
function backtestSignals(indicators, holdDays = 5) {
  const trades = [];
  
  for (let i = 0; i < indicators.length - holdDays; i++) {
    const signal = indicators[i];
    
    if (signal.signal.includes('BUY') || signal.signal.includes('SELL')) {
      const entryPrice = signal.price;
      const exitPrice = indicators[i + holdDays].price;
      const pnl = ((exitPrice - entryPrice) / entryPrice) * 100;
      
      // Determine if trade was correct
      const expectedDirection = signal.signal.includes('BUY') ? 1 : -1;
      const actualDirection = pnl > 0 ? 1 : -1;
      const correct = expectedDirection === actualDirection;
      
      trades.push({
        date: signal.date,
        signal: signal.signal,
        score: signal.score,
        entryPrice,
        exitPrice: exitPrice.toFixed(2),
        exitDate: indicators[i + holdDays].date,
        pnl: pnl.toFixed(2),
        correct
      });
    }
  }
  
  return trades;
}

// Calculate performance metrics
function calculateMetrics(trades) {
  if (trades.length === 0) return null;
  
  const wins = trades.filter(t => t.correct).length;
  const losses = trades.length - wins;
  const winRate = (wins / trades.length * 100).toFixed(1);
  
  const avgPnL = trades.reduce((sum, t) => sum + parseFloat(t.pnl), 0) / trades.length;
  const avgWin = trades.filter(t => t.correct).reduce((sum, t) => sum + parseFloat(t.pnl), 0) / wins || 0;
  const avgLoss = trades.filter(t => !t.correct).reduce((sum, t) => sum + parseFloat(t.pnl), 0) / losses || 0;
  
  const profitFactor = Math.abs(avgWin * wins / (avgLoss * losses)) || 0;
  
  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate,
    avgPnL: avgPnL.toFixed(2),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    profitFactor: profitFactor.toFixed(2)
  };
}

// Main analysis
async function runBacktest(symbol, days = 90, holdDays = 5) {
  const asset = ASSETS[symbol];
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`   TECHNICAL BACKTEST: ${asset.name} (${days} days)`);
  console.log(`═══════════════════════════════════════════════════════`);
  
  try {
    const prices = await fetchHistoricalPrices(asset.symbol, days);
    console.log(`📊 Fetched ${prices.length} price points`);
    
    const indicators = calculateIndicators(prices);
    console.log(`📈 Calculated ${indicators.length} indicator sets`);
    
    const trades = backtestSignals(indicators, holdDays);
    console.log(`🎯 Generated ${trades.length} signals`);
    
    const metrics = calculateMetrics(trades);
    
    // Display results
    console.log(`\n📊 PERFORMANCE METRICS:`);
    console.log(`   Total Trades: ${metrics.totalTrades}`);
    console.log(`   Win Rate: ${metrics.winRate}% (${metrics.wins}W / ${metrics.losses}L)`);
    console.log(`   Avg P&L: ${metrics.avgPnL}% per trade`);
    console.log(`   Avg Win: +${metrics.avgWin}% | Avg Loss: ${metrics.avgLoss}%`);
    console.log(`   Profit Factor: ${metrics.profitFactor}`);
    
    console.log(`\n📋 RECENT SIGNALS (Last 10):`);
    trades.slice(-10).forEach((t, i) => {
      const emoji = t.correct ? '✅' : '❌';
      console.log(`   ${emoji} ${t.date}: ${t.signal.padEnd(12)} Score:${t.score > 0 ? '+' : ''}${t.score} → ${t.pnl}% (${holdDays}d later)`);
    });
    
    // Signal distribution
    const bySignal = {};
    trades.forEach(t => {
      bySignal[t.signal] = bySignal[t.signal] || { count: 0, wins: 0 };
      bySignal[t.signal].count++;
      if (t.correct) bySignal[t.signal].wins++;
    });
    
    console.log(`\n📊 SIGNAL PERFORMANCE:`);
    Object.entries(bySignal).forEach(([sig, data]) => {
      const rate = (data.wins / data.count * 100).toFixed(0);
      console.log(`   ${sig.padEnd(15)}: ${rate}% win rate (${data.wins}/${data.count})`);
    });
    
    return { symbol, trades, metrics, indicators };
    
  } catch (e) {
    console.error(`❌ Backtest failed: ${e.message}`);
    return null;
  }
}

// Run for all assets
async function main() {
  const args = process.argv.slice(2);
  const symbol = args[0]?.toUpperCase() || 'HIMS';
  const days = parseInt(args[1]) || 90;
  const holdDays = parseInt(args[2]) || 5;
  
  console.log(`\n🔍 TECHNICAL-ONLY BACKTEST (no sentiment)`);
  console.log(`⏱️  Hold period: ${holdDays} days per trade`);
  
  if (symbol === 'ALL') {
    for (const sym of Object.keys(ASSETS)) {
      await runBacktest(sym, days, holdDays);
      await new Promise(r => setTimeout(r, 2000)); // Rate limit
    }
  } else {
    await runBacktest(symbol, days, holdDays);
  }
}

module.exports = { runBacktest, calculateIndicators, backtestSignals };

if (require.main === module) main();
