/**
 * ALPHA FUND v3.0 — Unified Execution Engine
 * Merges: alpha_signals_bot + position_sizer + paper_trader
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  mode: 'PAPER', // PAPER | LIVE
  max_positions: 10,
  risk_per_trade: 0.15,
  stop_loss: 0.08,
  take_profit: 0.25,
  min_confidence: 'MEDIUM'
};

// ─── SIGNAL GENERATOR ───────────────────────────────────────
function generateSignals(research, intelligence, portfolio) {
  const signals = [];
  const composite = research.composite || {};
  
  Object.values(composite).forEach(c => {
    const existingPosition = portfolio.positions.find(p => p.ticker === c.asset);
    
    // Entry signals
    if (c.rating.includes('BUY') && !existingPosition) {
      const confidence = c.confidence || 'LOW';
      if (confidence === 'HIGH' || (confidence === 'MEDIUM' && c.score >= 1.5)) {
        const signal = {
          action: 'BUY',
          ticker: c.asset,
          score: c.score,
          confidence: c.confidence,
          price: c.price,
          rating: c.rating,
          reason: `${c.technical} technical + ${c.sentiment} sentiment`
        };
signals.push(signal);
        logger.logSignal(signal);
      }
    }
    
    // Exit signals
    if (existingPosition && c.rating.includes('SELL')) {
      const signal = {
        action: 'SELL',
        ticker: c.asset,
        score: c.score,
        confidence: c.confidence,
        price: c.price,
        rating: c.rating,
        reason: `Signal flipped to ${c.rating}`
      };
      signals.push(signal);
      logger.logSignal(signal);
    }
  });
  
  // Check stop losses and take profits for existing positions
  portfolio.positions.forEach(pos => {
    const signal = composite[pos.ticker];
    if (!signal) return;
    
    const currentPrice = signal.price || pos.current_price;
    pos.current_price = currentPrice;
    
    // Trailing stop: move stop up if price rises
    if (currentPrice > pos.entry_price) {
      const newStop = currentPrice * (1 - CONFIG.stop_loss);
      if (newStop > pos.stop_loss) {
        pos.stop_loss = newStop;
      }
    }
    
    // Track best price and trailing stop
    if (!pos.best_price || currentPrice > pos.best_price) {
      pos.best_price = currentPrice;
      pos.trailing_stop = currentPrice * (1 - CONFIG.stop_loss);
    }
    if (pos.trailing_stop > pos.stop_loss) {
      pos.stop_loss = pos.trailing_stop;
    }
    
    // Update unrealized PnL
    pos.unrealized_pnl = (currentPrice - pos.entry_price) * pos.quantity;
    
    // Check hard stop loss or take profit
    if (currentPrice <= pos.stop_loss) {
      const exitSignal = {
        action: 'SELL',
        ticker: pos.ticker,
        score: -2,
        confidence: 'HIGH',
        price: currentPrice,
        rating: 'STOP_LOSS',
        reason: 'Stop loss hit'
      };
      signals.push(exitSignal);
      logger.logSignal(exitSignal);
    } else if (currentPrice >= pos.take_profit) {
      const exitSignal = {
        action: 'SELL',
        ticker: pos.ticker,
        score: 2,
        confidence: 'HIGH',
        price: currentPrice,
        rating: 'TAKE_PROFIT',
        reason: 'Take profit hit'
      };
      signals.push(exitSignal);
      logger.logSignal(exitSignal);
    }
  });
  
  return signals.sort((a, b) => b.score - a.score);
}

// ─── POSITION SIZER (Kelly Criterion) ──────────────────────
function sizePositions(signals, portfolio) {
  const sized = [];
  const totalValue = portfolio.cash + portfolio.positions.reduce((sum, p) => {
    return sum + p.quantity * (p.current_price || p.entry_price);
  }, 0);
  
  signals.forEach(signal => {
    if (signal.action !== 'BUY') {
      sized.push({ ...signal, size: 0, size_pct: 0 });
      return;
    }
    
    // Kelly fraction based on confidence
    let kellyFraction = 0;
    if (signal.confidence === 'HIGH') kellyFraction = 0.15;
    else if (signal.confidence === 'MEDIUM') kellyFraction = 0.10;
    else kellyFraction = 0.05;
    
    // Scale by score (more conviction = more size)
    kellyFraction *= Math.min(Math.abs(signal.score) / 3, 1);
    
    // Max position limit
    const maxSize = totalValue * CONFIG.risk_per_trade;
    const targetSize = totalValue * kellyFraction;
    const size = Math.min(targetSize, maxSize);
    
    sized.push({
      ...signal,
      size,
      size_pct: (size / totalValue) * 100,
      shares: Math.floor(size / signal.price),
      stop_loss: signal.price * (1 - CONFIG.stop_loss),
      take_profit: signal.price * (1 + CONFIG.take_profit)
    });
  });
  
  return sized;
}

// ─── PAPER TRADER ───────────────────────────────────────────
function executePaper(sizedSignals, portfolio) {
  const trades = [];
  
  sizedSignals.forEach(signal => {
    if (signal.action === 'BUY' && signal.shares > 0) {
      // Check if we have cash
      const cost = signal.shares * signal.price;
      if (cost > portfolio.cash) {
        console.log(`   ⚠️ Insufficient cash for ${signal.ticker} ($${cost.toFixed(2)} > $${portfolio.cash.toFixed(2)})`);
        return;
      }
      
      // Check position limit
      if (portfolio.positions.length >= CONFIG.max_positions) {
        console.log(`   ⚠️ Max positions reached (${CONFIG.max_positions})`);
        return;
      }
      
      // Execute buy
      portfolio.cash -= cost;
      const newPosition = {
        ticker: signal.ticker,
        quantity: signal.shares,
        entry_price: signal.price,
        current_price: signal.price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        entry_date: new Date().toISOString(),
        unrealized_pnl: 0,
        realized_pnl: 0,
        best_price: signal.price,
        trailing_stop: signal.stop_loss
      };
      portfolio.positions.push(newPosition);
      
      portfolio.performance.by_ticker = portfolio.performance.by_ticker || {};
      portfolio.performance.by_ticker[signal.ticker] = portfolio.performance.by_ticker[signal.ticker] || {
        ticker: signal.ticker,
        trades: 0,
        wins: 0,
        losses: 0,
        total_pnl: 0,
        avg_return_pct: 0
      };
      
      portfolio.trades.push({
        action: 'BUY',
        ticker: signal.ticker,
        quantity: signal.shares,
        price: signal.price,
        total: cost,
        date: new Date().toISOString(),
        reason: signal.reason
      });
      
      trades.push({
        action: 'BUY',
        ticker: signal.ticker,
        quantity: signal.shares,
        price: signal.price,
        total: cost
      });
      
      console.log(`   ✅ BOUGHT ${signal.shares} ${signal.ticker} @ $${signal.price.toFixed(2)} = $${cost.toFixed(2)}`);
      console.log(`      Stop: $${signal.stop_loss.toFixed(2)} | Target: $${signal.take_profit.toFixed(2)}`);
    }
    
    if (signal.action === 'SELL') {
      const position = portfolio.positions.find(p => p.ticker === signal.ticker);
      if (!position) return;
      
      const proceeds = position.quantity * signal.price;
      const pnl = proceeds - (position.quantity * position.entry_price);
      const pnl_pct = ((signal.price / position.entry_price) - 1) * 100;
      
      // Update per-ticker performance
      portfolio.performance.by_ticker = portfolio.performance.by_ticker || {};
      const tickerPerf = portfolio.performance.by_ticker[position.ticker] || {
        ticker: position.ticker,
        trades: 0,
        wins: 0,
        losses: 0,
        total_pnl: 0,
        avg_return_pct: 0
      };
      tickerPerf.trades += 1;
      tickerPerf.total_pnl += pnl;
      if (pnl > 0) tickerPerf.wins += 1;
      else tickerPerf.losses += 1;
      const allReturns = portfolio.trades
        .filter(t => t.action === 'SELL' && t.ticker === position.ticker)
        .map(t => t.pnl_pct || 0);
      tickerPerf.avg_return_pct = allReturns.length > 0
        ? allReturns.reduce((a, b) => a + b, 0) / allReturns.length
        : pnl_pct;
      portfolio.performance.by_ticker[position.ticker] = tickerPerf;
      
      portfolio.cash += proceeds;
      portfolio.positions = portfolio.positions.filter(p => p.ticker !== signal.ticker);
      
      portfolio.trades.push({
        action: 'SELL',
        ticker: signal.ticker,
        quantity: position.quantity,
        price: signal.price,
        total: proceeds,
        pnl,
        pnl_pct,
        date: new Date().toISOString(),
        reason: signal.reason
      });
      
      trades.push({
        action: 'SELL',
        ticker: signal.ticker,
        quantity: position.quantity,
        price: signal.price,
        total: proceeds,
        pnl,
        pnl_pct
      });
      
      console.log(`   ✅ SOLD ${position.quantity} ${signal.ticker} @ $${signal.price.toFixed(2)} = $${proceeds.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnl_pct.toFixed(1)}%)`);
    }
  });
  
  // Update performance
  updatePerformance(portfolio);
  
  return trades;
}

// ─── PERFORMANCE TRACKER ────────────────────────────────────
function updatePerformance(portfolio) {
  const totalValue = portfolio.cash + portfolio.positions.reduce((sum, p) => {
    return sum + p.quantity * (p.current_price || p.entry_price);
  }, 0);
  
  portfolio.performance.total_return = ((totalValue / portfolio.initial_capital) - 1) * 100;
  
  const closedTrades = portfolio.trades.filter(t => t.action === 'SELL');
  if (closedTrades.length > 0) {
    const wins = closedTrades.filter(t => t.pnl > 0);
    portfolio.performance.win_rate = (wins.length / closedTrades.length) * 100;
    portfolio.performance.total_trades = closedTrades.length;
    
    // Max drawdown (simplified)
    const values = portfolio.history.map(h => h.total_value);
    let maxDrawdown = 0;
    let peak = portfolio.initial_capital;
    
    values.forEach(v => {
      if (v > peak) peak = v;
      const drawdown = ((peak - v) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    portfolio.performance.max_drawdown = maxDrawdown;
  }
  
  // Record history
  portfolio.history.push({
    date: new Date().toISOString(),
    total_value: totalValue,
    cash: portfolio.cash,
    positions: portfolio.positions.length,
    return_pct: portfolio.performance.total_return,
    by_ticker: portfolio.performance.by_ticker || {}
  });
  
  if (portfolio.history.length > 90) {
    portfolio.history = portfolio.history.slice(-90);
  }
  
  // Update per-ticker unrealized PnL for open positions
  portfolio.positions.forEach(p => {
    if (p.current_price) {
      p.unrealized_pnl = (p.current_price - p.entry_price) * p.quantity;
    }
  });
}

module.exports = { generateSignals, sizePositions, executePaper, updatePerformance };
