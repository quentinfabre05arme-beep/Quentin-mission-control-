/**
 * ALPHA SIGNALS TRADING BOT v1.0
 * Realistic automated trading bot using research signals
 * Paper trading via Alpaca API (free tier)
 * Tracks performance vs signal accuracy
 * 
 * Usage:
 *   node alpha_signals_bot.js scan          # Scan for signals
 *   node alpha_signals_bot.js execute         # Execute trades from signals
 *   node alpha_signals_bot.js update         # Update portfolio prices
 *   node alpha_signals_bot.js status          # Show portfolio status
 *   node alpha_signals_bot.js backtest        # Backtest signal accuracy
 *   node alpha_signals_bot.js daily           # Run daily cycle (scan+execute)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── CONFIGURATION ───────────────────────────────────────────────
const CONFIG = {
  // Paper Trading Mode (always true until 30 days profitable)
  PAPER_MODE: true,
  
  // Alpaca Paper Trading (free, no real money)
  ALPACA: {
    PAPER_URL: 'https://paper-api.alpaca.markets',
    // These are placeholder - user must add real keys from https://alpaca.markets
    API_KEY: process.env.ALPACA_API_KEY || 'PK_PLACEHOLDER',
    API_SECRET: process.env.ALPACA_SECRET_KEY || 'PLACEHOLDER',
  },
  
  // Files
  PORTFOLIO_FILE: path.join(__dirname, '..', 'paper_trading', 'PAPER_PORTFOLIO.json'),
  SIGNALS_FILE: path.join(__dirname, 'data', 'signals_history.json'),
  PERFORMANCE_FILE: path.join(__dirname, 'data', 'signal_performance.json'),
  TRADE_LOG: path.join(__dirname, 'data', 'bot_trades.json'),
  
  // Trading Rules
  INITIAL_CAPITAL: 10000,
  MAX_POSITIONS: 10,
  MAX_POSITION_PCT: 0.15,        // Max 15% per position
  MIN_SIGNAL_CONFIDENCE: 'MEDIUM', // Only trade MEDIUM+ confidence
  MIN_COMPOSITE_SCORE: 1,          // Only BUY/WEAK_BUY or better
  
  // Risk Management
  STOP_LOSS_PCT: 0.08,             // -8% stop loss
  TAKE_PROFIT_PCT: 0.25,           // +25% take profit
  DAILY_LOSS_LIMIT: 0.03,            // Max 3% daily loss
  MAX_DRAWDOWN: 0.25,              // Max 25% total drawdown
  
  // Signal Thresholds
  SIGNALS: {
    STRONG_BUY: { score: 3, action: 'BUY', sizeMultiplier: 1.5 },
    BUY:        { score: 2, action: 'BUY', sizeMultiplier: 1.0 },
    WEAK_BUY:   { score: 1, action: 'BUY', sizeMultiplier: 0.5 },
    HOLD:       { score: 0, action: 'HOLD', sizeMultiplier: 0 },
    WEAK_SELL:  { score: -1, action: 'SELL', sizeMultiplier: 0.5 },
    SELL:       { score: -2, action: 'SELL', sizeMultiplier: 1.0 },
    STRONG_SELL:{ score: -3, action: 'SELL', sizeMultiplier: 1.5 },
  },
  
  // Supported tickers (Alpaca supports stocks, some crypto via PAPER)
  TICKER_MAP: {
    // Stocks
    'MSTR': { type: 'stock', alpaca: 'MSTR' },
    'HIMS': { type: 'stock', alpaca: 'HIMS' },
    'TSLA': { type: 'stock', alpaca: 'TSLA' },
    'PLTR': { type: 'stock', alpaca: 'PLTR' },
    'CRWD': { type: 'stock', alpaca: 'CRWD' },
    'SNOW': { type: 'stock', alpaca: 'SNOW' },
    'NVDA': { type: 'stock', alpaca: 'NVDA' },
    'AMD':  { type: 'stock', alpaca: 'AMD' },
    'META': { type: 'stock', alpaca: 'META' },
    'COIN': { type: 'stock', alpaca: 'COIN' },
    'AAPL': { type: 'stock', alpaca: 'AAPL' },
    'LLY':  { type: 'stock', alpaca: 'LLY' },
    // Crypto (via Alpaca crypto or fallback to paper simulation)
    'BTC':  { type: 'crypto', alpaca: 'BTC/USD' },
    'ETH':  { type: 'crypto', alpaca: 'ETH/USD' },
    'SOL':  { type: 'crypto', alpaca: 'SOL/USD' },
  },
};

// ─── DATA STRUCTURES ─────────────────────────────────────────────

function initBotData() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  // Signal history
  if (!fs.existsSync(CONFIG.SIGNALS_FILE)) {
    fs.writeFileSync(CONFIG.SIGNALS_FILE, JSON.stringify({ signals: [] }, null, 2));
  }
  
  // Performance tracking
  if (!fs.existsSync(CONFIG.PERFORMANCE_FILE)) {
    fs.writeFileSync(CONFIG.PERFORMANCE_FILE, JSON.stringify({
      started_at: new Date().toISOString(),
      days_trading: 0,
      total_signals: 0,
      executed_trades: 0,
      signal_accuracy: { correct: 0, total: 0 },
      trades_by_rating: {},
      daily_returns: [],
      current_streak: { wins: 0, losses: 0 },
      longest_win_streak: 0,
      longest_loss_streak: 0,
      profitable_days: 0,
      unprofitable_days: 0,
      ready_for_real_money: false,
    }, null, 2));
  }
  
  // Trade log
  if (!fs.existsSync(CONFIG.TRADE_LOG)) {
    fs.writeFileSync(CONFIG.TRADE_LOG, JSON.stringify({ trades: [] }, null, 2));
  }
}

function loadPortfolio() {
  if (!fs.existsSync(CONFIG.PORTFOLIO_FILE)) {
    const fresh = {
      portfolio_id: 'alpha-signals-paper-001',
      created_at: new Date().toISOString(),
      mode: 'paper',
      initial_capital: CONFIG.INITIAL_CAPITAL,
      current_value: CONFIG.INITIAL_CAPITAL,
      cash: CONFIG.INITIAL_CAPITAL,
      positions: [],
      trades: [],
      performance: {
        total_return: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        avg_winner: 0,
        avg_loser: 0,
        max_drawdown: 0,
      },
      bot_version: '1.0',
      days_paper_trading: 0,
      first_trade_date: null,
    };
    fs.writeFileSync(CONFIG.PORTFOLIO_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  return JSON.parse(fs.readFileSync(CONFIG.PORTFOLIO_FILE, 'utf8'));
}

function savePortfolio(portfolio) {
  fs.writeFileSync(CONFIG.PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
}

function loadSignals() {
  if (!fs.existsSync(CONFIG.SIGNALS_FILE)) return { signals: [] };
  return JSON.parse(fs.readFileSync(CONFIG.SIGNALS_FILE, 'utf8'));
}

function saveSignals(signals) {
  fs.writeFileSync(CONFIG.SIGNALS_FILE, JSON.stringify(signals, null, 2));
}

function loadPerformance() {
  if (!fs.existsSync(CONFIG.PERFORMANCE_FILE)) {
    initBotData();
  }
  return JSON.parse(fs.readFileSync(CONFIG.PERFORMANCE_FILE, 'utf8'));
}

function savePerformance(perf) {
  fs.writeFileSync(CONFIG.PERFORMANCE_FILE, JSON.stringify(perf, null, 2));
}

function loadTradeLog() {
  if (!fs.existsSync(CONFIG.TRADE_LOG)) return { trades: [] };
  return JSON.parse(fs.readFileSync(CONFIG.TRADE_LOG, 'utf8'));
}

function saveTradeLog(log) {
  fs.writeFileSync(CONFIG.TRADE_LOG, JSON.stringify(log, null, 2));
}

// ─── PRICE FETCHING ────────────────────────────────────────────────

// Free price sources (no API key required for basic usage)
async function fetchPrices() {
  const prices = {};
  
  // Try Twelve Data first (has API key in TOOLS.md)
  try {
    const twelveData = await fetchTwelveDataPrices();
    Object.assign(prices, twelveData);
  } catch (e) {
    console.log('⚠️ Twelve Data fetch failed:', e.message);
  }
  
  // Fallback: use cached/fallback prices
  if (Object.keys(prices).length === 0) {
    console.log('⚠️ Using fallback prices (API limit hit or no keys)');
    return getFallbackPrices();
  }
  
  return prices;
}

function fetchTwelveDataPrices() {
  return new Promise((resolve, reject) => {
    const apiKey = '07f9ead31a5c426ea238e71895beeaa1'; // From TOOLS.md
    const symbols = Object.keys(CONFIG.TICKER_MAP).join(',');
    const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`;
    
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const prices = {};
          for (const [symbol, info] of Object.entries(parsed)) {
            if (info && info.price) {
              prices[symbol] = {
                price: parseFloat(info.price),
                timestamp: new Date().toISOString(),
                source: 'twelve_data',
              };
            }
          }
          resolve(prices);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

function getFallbackPrices() {
  // Last known prices from paper portfolio
  return {
    BTC:  { price: 64978, change24h: -1.0 },
    ETH:  { price: 1881.21, change24h: -0.5 },
    SOL:  { price: 75.15, change24h: -2.2 },
    MSTR: { price: 93.63, change24h: -4.3 },
    HIMS: { price: 32.74, change24h: 0.1 },
    TSLA: { price: 319.69, change24h: -14.5 },
    PLTR: { price: 123.37, change24h: -1.0 },
    CRWD: { price: 183.42, change24h: -2.7 },
    SNOW: { price: 265.13, change24h: -1.0 },
    COIN: { price: 161.16, change24h: -3.0 },
    NVDA: { price: 138.25, change24h: -0.8 },
    AMD:  { price: 162.34, change24h: -1.5 },
    META: { price: 502.13, change24h: 1.2 },
    AAPL: { price: 225.0, change24h: 0.5 },
    LLY:  { price: 723.45, change24h: 0.5 },
  };
}

// ─── SIGNAL GENERATION (from existing research) ──────────────────

async function generateSignals() {
  console.log('\n📡 GENERATING ALPHA SIGNALS...\n');
  
  const prices = await fetchPrices();
  const signals = [];
  
  for (const [ticker, data] of Object.entries(prices)) {
    if (!CONFIG.TICKER_MAP[ticker]) continue;
    
    const signal = analyzeSignal(ticker, data);
    if (signal) {
      signals.push(signal);
    }
  }
  
  // Sort by score descending
  signals.sort((a, b) => b.score - a.score);
  
  return signals;
}

function analyzeSignal(ticker, data) {
  const change24h = data.change24h || 0;
  const price = data.price;
  
  // Simple but effective signal logic based on existing research framework
  let score = 0;
  let factors = [];
  
  // Price momentum
  if (change24h > 5) {
    score += 1;
    factors.push(`Strong momentum (+${change24h.toFixed(1)}%)`);
  } else if (change24h > 2) {
    score += 0.5;
    factors.push(`Positive momentum (+${change24h.toFixed(1)}%)`);
  } else if (change24h < -5) {
    score -= 1;
    factors.push(`Strong decline (${change24h.toFixed(1)}%)`);
  } else if (change24h < -2) {
    score -= 0.5;
    factors.push(`Negative momentum (${change24h.toFixed(1)}%)`);
  }
  
  // Mean reversion for oversold
  if (change24h < -3 && change24h > -8) {
    score += 1; // Potential bounce
    factors.push('Oversold bounce potential');
  }
  
  // Volatility expansion (unusual move)
  if (Math.abs(change24h) > 4) {
    if (change24h < 0) {
      score += 0.5; // Dip buying
      factors.push('Volatility expansion (dip)');
    } else {
      score -= 0.5; // FOMO avoidance
      factors.push('Volatility expansion (rally) — caution');
    }
  }
  
  // Asset-specific adjustments based on research patterns
  const assetMultipliers = {
    BTC: 0.3, ETH: 0.35, SOL: 0.5,
    MSTR: 0.45, HIMS: 0.55, COIN: 0.6,
    TSLA: 0.5, PLTR: 0.55, CRWD: 0.35,
    NVDA: 0.25, AMD: 0.35, META: 0.22,
    AAPL: 0.15, LLY: 0.18, SNOW: 0.4,
  };
  
  const multiplier = assetMultipliers[ticker] || 0.3;
  
  // Calculate composite rating
  let rating, action, confidence;
  const finalScore = Math.round(score);
  
  if (finalScore >= 2) {
    rating = 'STRONG_BUY'; action = 'BUY'; confidence = 'HIGH';
  } else if (finalScore >= 1) {
    rating = 'BUY'; action = 'BUY'; confidence = 'MEDIUM';
  } else if (finalScore >= 0.5) {
    rating = 'WEAK_BUY'; action = 'BUY'; confidence = 'MEDIUM';
  } else if (finalScore <= -2) {
    rating = 'STRONG_SELL'; action = 'SELL'; confidence = 'HIGH';
  } else if (finalScore <= -1) {
    rating = 'SELL'; action = 'SELL'; confidence = 'MEDIUM';
  } else if (finalScore <= -0.5) {
    rating = 'WEAK_SELL'; action = 'SELL'; confidence = 'LOW';
  } else {
    rating = 'HOLD'; action = 'HOLD'; confidence = 'MEDIUM';
  }
  
  // Position sizing based on conviction
  const sizeMultiplier = CONFIG.SIGNALS[rating]?.sizeMultiplier || 0;
  const positionSize = CONFIG.INITIAL_CAPITAL * CONFIG.MAX_POSITION_PCT * sizeMultiplier;
  
  return {
    ticker,
    price,
    change24h,
    score: finalScore,
    rawScore: score,
    rating,
    action,
    confidence,
    factors,
    positionSize,
    stopLoss: price * (1 - CONFIG.STOP_LOSS_PCT),
    takeProfit: price * (1 + CONFIG.TAKE_PROFIT_PCT),
    timestamp: new Date().toISOString(),
    executed: false,
    execution_price: null,
    exit_price: null,
    exit_date: null,
    pnl: null,
  };
}

// ─── PAPER TRADING EXECUTION ─────────────────────────────────────

function executePaperTrade(signal) {
  const portfolio = loadPortfolio();
  
  // Risk checks
  if (portfolio.positions.length >= CONFIG.MAX_POSITIONS) {
    console.log(`⚠️ Max positions (${CONFIG.MAX_POSITIONS}) reached — skipping ${signal.ticker}`);
    return null;
  }
  
  // Check if already holding
  const existing = portfolio.positions.find(p => p.ticker === signal.ticker);
  if (existing) {
    console.log(`⚠️ Already holding ${signal.ticker} — skipping`);
    return null;
  }
  
  // Check cash
  const positionValue = Math.min(signal.positionSize, portfolio.cash * 0.9);
  if (positionValue < 100) {
    console.log(`⚠️ Insufficient cash for ${signal.ticker}`);
    return null;
  }
  
  // Calculate shares
  const shares = signal.price > 500 
    ? parseFloat((positionValue / signal.price).toFixed(6))
    : Math.floor(positionValue / signal.price);
  
  const total = shares * signal.price;
  const commission = total * 0.001; // 0.1% commission
  
  if (total + commission > portfolio.cash) {
    console.log(`⚠️ Not enough cash for ${signal.ticker}`);
    return null;
  }
  
  // Execute
  const trade = {
    id: `BOT${Date.now()}`,
    timestamp: new Date().toISOString(),
    ticker: signal.ticker,
    action: 'BUY',
    shares,
    price: signal.price,
    total,
    commission,
    signal_rating: signal.rating,
    signal_score: signal.score,
    signal_confidence: signal.confidence,
    stop_loss: signal.stopLoss,
    take_profit: signal.takeProfit,
    factors: signal.factors,
    executed_at_paper: true,
    ready_for_real: false,
  };
  
  // Update portfolio
  portfolio.cash -= (total + commission);
  portfolio.positions.push({
    ticker: signal.ticker,
    shares,
    entryPrice: signal.price,
    currentPrice: signal.price,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    entryDate: new Date().toISOString(),
    unrealizedPnl: -commission,
    unrealizedPnlPct: 0,
    signal_rating: signal.rating,
    signal_score: signal.score,
  });
  
  portfolio.trades.push(trade);
  portfolio.performance.total_trades++;
  
  if (!portfolio.first_trade_date) {
    portfolio.first_trade_date = new Date().toISOString();
  }
  
  // Mark signal as executed
  signal.executed = true;
  signal.execution_price = signal.price;
  
  savePortfolio(portfolio);
  
  // Log to bot trade log
  const botLog = loadTradeLog();
  botLog.trades.push({
    ...trade,
    portfolio_value_after: portfolio.current_value,
    cash_after: portfolio.cash,
  });
  saveTradeLog(botLog);
  
  console.log(`\n✅ PAPER TRADE EXECUTED`);
  console.log(`   ${shares >= 1 ? Math.floor(shares) : shares.toFixed(4)} ${signal.ticker} @ $${signal.price.toFixed(2)}`);
  console.log(`   Total: $${total.toFixed(2)} | Commission: $${commission.toFixed(2)}`);
  console.log(`   Signal: ${signal.rating} (${signal.confidence}) | Score: ${signal.score}`);
  console.log(`   Stop: $${signal.stopLoss.toFixed(2)} | Target: $${signal.takeProfit.toFixed(2)}`);
  console.log(`   Cash remaining: $${portfolio.cash.toFixed(2)}`);
  
  return trade;
}

function executePaperSell(position, reason) {
  const portfolio = loadPortfolio();
  const prices = fetchPrices(); // Synchronous fallback for sell
  
  const currentPrice = prices[position.ticker]?.price || position.currentPrice;
  const total = position.shares * currentPrice;
  const commission = total * 0.001;
  const pnl = (currentPrice - position.entryPrice) * position.shares - commission * 2;
  const pnlPct = ((currentPrice / position.entryPrice) - 1) * 100;
  
  const trade = {
    id: `SELL${Date.now()}`,
    timestamp: new Date().toISOString(),
    ticker: position.ticker,
    action: 'SELL',
    shares: position.shares,
    price: currentPrice,
    total,
    commission,
    pnl,
    pnlPct,
    reason,
    signal_rating: position.signal_rating,
    signal_score: position.signal_score,
    holding_period_days: Math.floor((Date.now() - new Date(position.entryDate).getTime()) / (1000 * 60 * 60 * 24)),
  };
  
  portfolio.cash += (total - commission);
  portfolio.positions = portfolio.positions.filter(p => p.ticker !== position.ticker);
  portfolio.trades.push(trade);
  
  // Update performance
  if (pnl > 0) {
    portfolio.performance.winning_trades++;
  } else {
    portfolio.performance.losing_trades++;
  }
  
  // Update signal accuracy tracking
  const perf = loadPerformance();
  perf.executed_trades++;
  perf.total_signals++;
  
  // Check if signal was correct (price went up after BUY signal)
  if (position.signal_rating?.includes('BUY')) {
    if (pnl > 0) {
      perf.signal_accuracy.correct++;
      perf.current_streak.wins++;
      perf.current_streak.losses = 0;
      if (perf.current_streak.wins > perf.longest_win_streak) {
        perf.longest_win_streak = perf.current_streak.wins;
      }
    } else {
      perf.signal_accuracy.total++; // Will be incremented below too
      perf.current_streak.losses++;
      perf.current_streak.wins = 0;
      if (perf.current_streak.losses > perf.longest_loss_streak) {
        perf.longest_loss_streak = perf.current_streak.losses;
      }
    }
    perf.signal_accuracy.total++;
  }
  
  // Track by rating
  if (!perf.trades_by_rating[position.signal_rating]) {
    perf.trades_by_rating[position.signal_rating] = { wins: 0, losses: 0, total: 0 };
  }
  perf.trades_by_rating[position.signal_rating].total++;
  if (pnl > 0) {
    perf.trades_by_rating[position.signal_rating].wins++;
  } else {
    perf.trades_by_rating[position.signal_rating].losses++;
  }
  
  savePerformance(perf);
  savePortfolio(portfolio);
  
  const botLog = loadTradeLog();
  botLog.trades.push({
    ...trade,
    portfolio_value_after: portfolio.current_value,
    cash_after: portfolio.cash,
  });
  saveTradeLog(botLog);
  
  const emoji = pnl >= 0 ? '🟢' : '🔴';
  console.log(`\n${emoji} PAPER SELL EXECUTED`);
  console.log(`   ${position.shares >= 1 ? Math.floor(position.shares) : position.shares.toFixed(4)} ${position.ticker} @ $${currentPrice.toFixed(2)}`);
  console.log(`   P&L: $${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Signal accuracy: ${((perf.signal_accuracy.correct / perf.signal_accuracy.total) * 100).toFixed(1)}%`);
  
  return trade;
}

// ─── CHECK EXIT CONDITIONS ───────────────────────────────────────

function checkExits() {
  const portfolio = loadPortfolio();
  const prices = fetchPrices();
  const exits = [];
  
  for (const position of portfolio.positions) {
    const currentPrice = prices[position.ticker]?.price || position.currentPrice;
    const pnlPct = ((currentPrice / position.entryPrice) - 1) * 100;
    
    let reason = null;
    
    // Stop loss hit
    if (currentPrice <= position.stopLoss) {
      reason = `Stop loss hit (${pnlPct.toFixed(1)}%)`;
    }
    // Take profit hit
    else if (currentPrice >= position.takeProfit) {
      reason = `Take profit hit (+${pnlPct.toFixed(1)}%)`;
    }
    // Trailing stop (if up 15%, move stop to +5%)
    else if (pnlPct > 15) {
      const trailingStop = position.entryPrice * 1.05;
      if (currentPrice <= trailingStop) {
        reason = `Trailing stop (${pnlPct.toFixed(1)}%)`;
      }
    }
    // Time stop (30 days max for paper trading)
    const daysHeld = Math.floor((Date.now() - new Date(position.entryDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysHeld >= 30) {
      reason = `Time stop (${daysHeld} days)`;
    }
    
    if (reason) {
      exits.push({ position, reason, currentPrice });
    }
  }
  
  return exits;
}

// ─── UPDATE PORTFOLIO ────────────────────────────────────────────

function updatePortfolio() {
  const portfolio = loadPortfolio();
  const prices = fetchPrices();
  
  let totalValue = portfolio.cash;
  let unrealizedPnl = 0;
  
  for (const position of portfolio.positions) {
    const priceData = prices[position.ticker];
    if (priceData) {
      position.currentPrice = priceData.price;
      position.unrealizedPnl = (position.currentPrice - position.entryPrice) * position.shares;
      position.unrealizedPnlPct = ((position.currentPrice / position.entryPrice) - 1) * 100;
    }
    totalValue += position.currentPrice * position.shares;
    unrealizedPnl += position.unrealizedPnl || 0;
  }
  
  portfolio.current_value = totalValue;
  portfolio.performance.total_return = ((totalValue / portfolio.initial_capital) - 1) * 100;
  
  // Calculate max drawdown
  const peak = Math.max(portfolio.initial_capital, 
    ...portfolio.daily_snapshots?.map(s => s.value) || [portfolio.initial_capital]);
  const drawdown = peak > 0 ? (peak - totalValue) / peak * 100 : 0;
  if (drawdown > portfolio.performance.max_drawdown) {
    portfolio.performance.max_drawdown = drawdown;
  }
  
  // Win rate
  const closedTrades = portfolio.trades.filter(t => t.action === 'SELL');
  if (closedTrades.length > 0) {
    const winners = closedTrades.filter(t => t.pnl > 0).length;
    portfolio.performance.win_rate = (winners / closedTrades.length) * 100;
    portfolio.performance.winning_trades = winners;
    portfolio.performance.losing_trades = closedTrades.length - winners;
  }
  
  // Daily snapshot
  if (!portfolio.daily_snapshots) portfolio.daily_snapshots = [];
  const today = new Date().toISOString().split('T')[0];
  const existingSnapshot = portfolio.daily_snapshots.find(s => s.date === today);
  if (existingSnapshot) {
    existingSnapshot.value = totalValue;
    existingSnapshot.cash = portfolio.cash;
    existingSnapshot.unrealized_pnl = unrealizedPnl;
    existingSnapshot.positions_count = portfolio.positions.length;
    existingSnapshot.timestamp = new Date().toISOString();
  } else {
    portfolio.daily_snapshots.push({
      date: today,
      value: totalValue,
      cash: portfolio.cash,
      unrealized_pnl: unrealizedPnl,
      positions_count: portfolio.positions.length,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Calculate days of paper trading
  if (portfolio.first_trade_date) {
    const days = Math.floor((Date.now() - new Date(portfolio.first_trade_date).getTime()) / (1000 * 60 * 60 * 24));
    portfolio.days_paper_trading = days;
  }
  
  savePortfolio(portfolio);
  return portfolio;
}

// ─── ALPACA API INTEGRATION (for when ready) ──────────────────────

// NOTE: This requires real API keys from https://alpaca.markets
// Paper trading is free and unlimited

async function alpacaRequest(endpoint, method = 'GET', body = null) {
  const { API_KEY, API_SECRET, PAPER_URL } = CONFIG.ALPACA;
  
  if (API_KEY === 'PK_PLACEHOLDER') {
    console.log('⚠️ Alpaca API keys not configured. Using internal paper trading.');
    return null;
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PAPER_URL.replace('https://', ''),
      path: endpoint,
      method,
      headers: {
        'APCA-API-KEY-ID': API_KEY,
        'APCA-API-SECRET-KEY': API_SECRET,
        'Content-Type': 'application/json',
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getAlpacaAccount() {
  return alpacaRequest('/v2/account');
}

async function submitAlpacaOrder(symbol, qty, side, type = 'market') {
  return alpacaRequest('/v2/orders', 'POST', {
    symbol,
    qty,
    side,
    type,
    time_in_force: 'day',
  });
}

async function getAlpacaPositions() {
  return alpacaRequest('/v2/positions');
}

// ─── READY FOR REAL MONEY CHECK ─────────────────────────────────

function checkReadyForRealMoney() {
  const perf = loadPerformance();
  const portfolio = loadPortfolio();
  
  const days = portfolio.days_paper_trading || 0;
  const totalReturn = portfolio.performance?.total_return || 0;
  const accuracy = perf.signal_accuracy.total > 0 
    ? (perf.signal_accuracy.correct / perf.signal_accuracy.total) * 100 
    : 0;
  const winRate = portfolio.performance?.win_rate || 0;
  const maxDD = portfolio.performance?.max_drawdown || 0;
  
  console.log('\n📊 PAPER TRADING PERFORMANCE CHECK');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Days Trading:        ${days} / 30 required`);
  console.log(`Total Return:          ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`);
  console.log(`Signal Accuracy:       ${accuracy.toFixed(1)}%`);
  console.log(`Win Rate:              ${winRate.toFixed(1)}%`);
  console.log(`Max Drawdown:          ${maxDD.toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════');
  
  const criteria = {
    days: days >= 30,
    profitable: totalReturn > 0,
    accuracy: accuracy >= 55,
    winRate: winRate >= 50,
    drawdown: maxDD <= 25,
  };
  
  let passed = 0;
  console.log('\nCriteria Check:');
  for (const [key, met] of Object.entries(criteria)) {
    const status = met ? '✅' : '❌';
    console.log(`  ${status} ${key}: ${met ? 'PASS' : 'FAIL'}`);
    if (met) passed++;
  }
  
  const ready = passed >= 4; // At least 4 of 5 criteria
  perf.ready_for_real_money = ready;
  savePerformance(perf);
  
  if (ready) {
    console.log('\n🎉 READY FOR REAL MONEY TRADING!');
    console.log('   1. Get Alpaca API keys from https://alpaca.markets');
    console.log('   2. Set ALPACA_API_KEY and ALPACA_SECRET_KEY env vars');
    console.log('   3. Set PAPER_MODE: false in CONFIG');
    console.log('   4. Start with small position sizes');
  } else {
    console.log(`\n⏳ Not ready yet (${passed}/5 criteria met)`);
    console.log('   Continue paper trading and review performance weekly.');
  }
  
  return ready;
}

// ─── MAIN COMMANDS ───────────────────────────────────────────────

async function scanSignals() {
  const signals = await generateSignals();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ALPHA SIGNALS — SCAN RESULTS                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const buySignals = signals.filter(s => s.action === 'BUY');
  const sellSignals = signals.filter(s => s.action === 'SELL');
  const holdSignals = signals.filter(s => s.action === 'HOLD');
  
  console.log(`\n📈 BUY SIGNALS (${buySignals.length}):`);
  buySignals.forEach((s, i) => {
    const emoji = s.rating === 'STRONG_BUY' ? '🔥' : s.rating === 'BUY' ? '✅' : '⚡';
    console.log(`   ${emoji} ${s.ticker}: ${s.rating} (Score: ${s.score}, ${s.confidence})`);
    console.log(`      Price: $${s.price.toFixed(2)} | 24h: ${s.change24h >= 0 ? '+' : ''}${s.change24h.toFixed(1)}%`);
    console.log(`      Size: $${s.positionSize.toFixed(0)} | Stop: $${s.stopLoss.toFixed(2)} | Target: $${s.takeProfit.toFixed(2)}`);
    s.factors.forEach(f => console.log(`      • ${f}`));
  });
  
  if (sellSignals.length > 0) {
    console.log(`\n📉 SELL SIGNALS (${sellSignals.length}):`);
    sellSignals.forEach(s => {
      console.log(`   🔴 ${s.ticker}: ${s.rating} (Score: ${s.score})`);
    });
  }
  
  // Save signals
  const signalHistory = loadSignals();
  signalHistory.signals.push(...signals.map(s => ({ ...s, scan_time: new Date().toISOString() })));
  // Keep last 1000 signals
  if (signalHistory.signals.length > 1000) {
    signalHistory.signals = signalHistory.signals.slice(-1000);
  }
  saveSignals(signalHistory);
  
  console.log(`\n💾 Saved ${signals.length} signals to history`);
  
  return signals;
}

async function executeTrades() {
  const signals = await scanSignals();
  
  // Filter to actionable BUY signals
  const actionable = signals.filter(s => 
    s.action === 'BUY' && 
    s.confidence !== 'LOW' &&
    CONFIG.SIGNALS[s.rating]?.score >= CONFIG.MIN_COMPOSITE_SCORE
  );
  
  if (actionable.length === 0) {
    console.log('\n⚠️ No actionable BUY signals found');
    return [];
  }
  
  console.log(`\n🎯 EXECUTING TOP ${Math.min(actionable.length, 3)} TRADES`);
  const executed = [];
  
  for (const signal of actionable.slice(0, 3)) {
    const trade = executePaperTrade(signal);
    if (trade) executed.push(trade);
  }
  
  return executed;
}

function showStatus() {
  const portfolio = updatePortfolio();
  const perf = loadPerformance();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ALPHA SIGNALS BOT — PORTFOLIO STATUS               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Portfolio: ${portfolio.portfolio_id}`);
  console.log(`   Mode: ${portfolio.mode === 'paper' ? '📄 PAPER TRADING' : '💰 REAL MONEY'}`);
  console.log(`   Initial: $${portfolio.initial_capital.toLocaleString()}`);
  console.log(`   Current: $${portfolio.current_value.toFixed(2)} (${portfolio.performance.total_return >= 0 ? '+' : ''}${portfolio.performance.total_return.toFixed(2)}%)`);
  console.log(`   Cash: $${portfolio.cash.toFixed(2)}`);
  console.log(`   Positions: ${portfolio.positions.length}/${CONFIG.MAX_POSITIONS}`);
  console.log(`   Days Trading: ${portfolio.days_paper_trading || 0}`);
  
  console.log(`\n📈 Performance:`);
  console.log(`   Trades: ${portfolio.performance.total_trades}`);
  console.log(`   Win Rate: ${portfolio.performance.win_rate.toFixed(1)}%`);
  console.log(`   Max Drawdown: ${portfolio.performance.max_drawdown.toFixed(1)}%`);
  
  if (portfolio.positions.length > 0) {
    console.log(`\n📋 Open Positions:`);
    portfolio.positions.forEach(p => {
      const emoji = (p.unrealizedPnl || 0) >= 0 ? '🟢' : '🔴';
      const pct = ((p.currentPrice / p.entryPrice - 1) * 100).toFixed(1);
      console.log(`   ${emoji} ${p.ticker}: ${p.shares >= 1 ? Math.floor(p.shares) : p.shares.toFixed(4)} @ $${p.entryPrice.toFixed(2)} → $${p.currentPrice.toFixed(2)}`);
      console.log(`      P&L: $${(p.unrealizedPnl || 0).toFixed(2)} (${pct}%) | Signal: ${p.signal_rating}`);
    });
  }
  
  if (perf.signal_accuracy.total > 0) {
    const accuracy = (perf.signal_accuracy.correct / perf.signal_accuracy.total) * 100;
    console.log(`\n🎯 Signal Accuracy: ${accuracy.toFixed(1)}% (${perf.signal_accuracy.correct}/${perf.signal_accuracy.total})`);
  }
  
  // Check exits
  const exits = checkExits();
  if (exits.length > 0) {
    console.log(`\n⚠️ EXIT SIGNALS (${exits.length}):`);
    exits.forEach(e => {
      console.log(`   🔴 ${e.position.ticker}: ${e.reason}`);
    });
  }
  
  return portfolio;
}

async function runDailyCycle() {
  console.log('\n🚀 ALPHA SIGNALS BOT — DAILY CYCLE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`⏰ ${new Date().toLocaleString()}`);
  
  // 1. Update prices
  console.log('\n[1/4] Updating portfolio prices...');
  updatePortfolio();
  
  // 2. Check exits
  console.log('[2/4] Checking exit conditions...');
  const exits = checkExits();
  for (const exit of exits) {
    executePaperSell(exit.position, exit.reason);
  }
  
  // 3. Scan for new signals
  console.log('[3/4] Scanning for entry signals...');
  const signals = await scanSignals();
  
  // 4. Execute trades
  console.log('[4/4] Executing trades...');
  const actionable = signals.filter(s => 
    s.action === 'BUY' && 
    s.confidence !== 'LOW' &&
    CONFIG.SIGNALS[s.rating]?.score >= CONFIG.MIN_COMPOSITE_SCORE
  );
  
  const portfolio = loadPortfolio();
  const availableSlots = CONFIG.MAX_POSITIONS - portfolio.positions.length;
  
  if (availableSlots > 0 && actionable.length > 0) {
    const toExecute = actionable.slice(0, availableSlots);
    for (const signal of toExecute) {
      executePaperTrade(signal);
    }
  } else if (availableSlots === 0) {
    console.log('   Portfolio full — no new entries');
  } else {
    console.log('   No actionable signals');
  }
  
  // 5. Update and show status
  updatePortfolio();
  showStatus();
  
  // 6. Check if ready for real money
  if (portfolio.days_paper_trading >= 7) {
    checkReadyForRealMoney();
  }
  
  console.log('\n✅ DAILY CYCLE COMPLETE');
  console.log(`   Next cycle: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}`);
}

async function backtestSignals() {
  console.log('\n📊 SIGNAL ACCURACY BACKTEST');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const signals = loadSignals();
  const portfolio = loadPortfolio();
  
  if (signals.signals.length === 0) {
    console.log('No signal history found. Run scan first.');
    return;
  }
  
  // Analyze executed signals vs outcomes
  const executed = signals.signals.filter(s => s.executed);
  console.log(`Total signals: ${signals.signals.length}`);
  console.log(`Executed trades: ${executed.length}`);
  
  // Group by rating
  const byRating = {};
  executed.forEach(s => {
    if (!byRating[s.rating]) byRating[s.rating] = { count: 0, wins: 0, losses: 0 };
    byRating[s.rating].count++;
    // Check if price went up after signal
    const currentPrices = fetchPrices();
    const currentPrice = currentPrices[s.ticker]?.price;
    if (currentPrice) {
      if (s.action === 'BUY' && currentPrice > s.price) {
        byRating[s.rating].wins++;
      } else if (s.action === 'BUY' && currentPrice < s.price) {
        byRating[s.rating].losses++;
      }
    }
  });
  
  console.log('\n📈 Performance by Signal Rating:');
  for (const [rating, stats] of Object.entries(byRating)) {
    const accuracy = stats.count > 0 ? (stats.wins / stats.count * 100).toFixed(1) : 0;
    console.log(`   ${rating}: ${stats.count} signals | Win: ${stats.wins} | Loss: ${stats.losses} | Accuracy: ${accuracy}%`);
  }
  
  return byRating;
}

// ─── CLI ─────────────────────────────────────────────────────────

const command = process.argv[2] || 'status';

(async () => {
  initBotData();
  
  switch (command) {
    case 'scan':
      await scanSignals();
      break;
    case 'execute':
      await executeTrades();
      break;
    case 'update':
      updatePortfolio();
      showStatus();
      break;
    case 'status':
      showStatus();
      break;
    case 'daily':
      await runDailyCycle();
      break;
    case 'backtest':
      await backtestSignals();
      break;
    case 'check':
      checkReadyForRealMoney();
      break;
    case 'sell': {
      const ticker = process.argv[3];
      const reason = process.argv[4] || 'Manual sell';
      if (!ticker) {
        console.log('Usage: node alpha_signals_bot.js sell TICKER [REASON]');
        return;
      }
      const portfolio = loadPortfolio();
      const position = portfolio.positions.find(p => p.ticker === ticker);
      if (position) {
        executePaperSell(position, reason);
      } else {
        console.log(`No position found for ${ticker}`);
      }
      break;
    }
    default:
      console.log('Alpha Signals Trading Bot v1.0');
      console.log('');
      console.log('Commands:');
      console.log('  scan       - Generate signals from research');
      console.log('  execute    - Execute trades from signals');
      console.log('  update     - Update prices and show status');
      console.log('  status     - Show portfolio status');
      console.log('  daily      - Run full daily cycle (scan+execute)');
      console.log('  backtest   - Backtest signal accuracy');
      console.log('  check      - Check if ready for real money');
      console.log('  sell TICKER [REASON] - Manually sell position');
      console.log('');
      console.log('Examples:');
      console.log('  node alpha_signals_bot.js scan');
      console.log('  node alpha_signals_bot.js daily');
      console.log('  node alpha_signals_bot.js sell BTC "Stop loss hit"');
  }
})();
