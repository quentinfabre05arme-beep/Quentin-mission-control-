// Kelly Criterion Position Sizing with Volatility Adjustment
// Based on Ernest Chan's research and López de Prado papers

const fs = require('fs');
const path = require('path');

class KellyPositionSizing {
  constructor(portfolioValue = 50000) {
    this.portfolioValue = portfolioValue;
    this.maxKellyFraction = 0.3; // Use 30% of full Kelly (conservative)
    this.maxPositionPct = 0.10;  // 10% max per position
    this.minPositionPct = 0.02;  // 2% minimum
  }

  // Calculate Kelly fraction from historical trades
  calculateKellyFraction(winRate, avgWin, avgLoss) {
    // Kelly = (p*b - q) / b
    // p = win rate, q = loss rate, b = avg win / avg loss
    const p = winRate;
    const q = 1 - winRate;
    const b = Math.abs(avgWin / avgLoss);
    
    const kelly = (p * b - q) / b;
    return Math.max(0, kelly); // No negative Kelly
  }

  // Volatility adjustment (lower size in high vol)
  volatilityAdjustment(atr, price, lookback = 20) {
    const vol = atr / price; // ATR as % of price
    const normalVol = 0.02;  // 2% daily vol is "normal"
    
    // Reduce size as vol increases
    const adjustment = Math.min(1, normalVol / vol);
    return adjustment;
  }

  // Tier-based adjustments
  tierMultiplier(tier) {
    const multipliers = {
      'T1': 1.0,   // Short-term: full Kelly
      'T2': 0.8,   // Mid-term: 80% of calculated
      'T3': 0.5    // Long-term: 50% (wider stops)
    };
    return multipliers[tier] || 0.8;
  }

  // Calculate position size
  calculatePosition(tradeSetup) {
    const {
      tier = 'T2',
      winRate = 0.55,      // Conservative default
      avgWin = 0.15,       // 15% average win
      avgLoss = 0.08,      // 8% average loss
      atr = null,
      price = null,
      stopLoss = null,
      entryPrice = null
    } = tradeSetup;

    // Base Kelly calculation
    const fullKelly = this.calculateKellyFraction(winRate, avgWin, avgLoss);
    const fractionalKelly = fullKelly * this.maxKellyFraction;
    
    // Portfolio allocation
    let positionPct = fractionalKelly;
    
    // Apply tier multiplier
    positionPct *= this.tierMultiplier(tier);
    
    // Volatility adjustment
    if (atr && price) {
      const volAdj = this.volatilityAdjustment(atr, price);
      positionPct *= volAdj;
    }
    
    // Stop-based sizing (risk per trade)
    if (stopLoss && entryPrice) {
      const riskPct = Math.abs(stopLoss - entryPrice) / entryPrice;
      const riskBasedSize = 0.02 / riskPct; // Risk 2% of portfolio
      positionPct = Math.min(positionPct, riskBasedSize);
    }
    
    // Clamp to limits
    positionPct = Math.max(this.minPositionPct, Math.min(this.maxPositionPct, positionPct));
    
    const positionSize = this.portfolioValue * positionPct;
    
    return {
      kellyFraction: fullKelly.toFixed(3),
      fractionalKelly: fractionalKelly.toFixed(3),
      tierMultiplier: this.tierMultiplier(tier),
      finalPositionPct: (positionPct * 100).toFixed(2) + '%',
      positionSize: positionSize.toFixed(2),
      shares: entryPrice ? Math.floor(positionSize / entryPrice) : null,
      riskPerTrade: stopLoss && entryPrice ? 
        (this.portfolioValue * 0.02).toFixed(2) : 'N/A'
    };
  }

  // Update with actual performance
  updateFromPerformance(tradeHistory) {
    if (tradeHistory.length < 10) return null; // Need minimum sample
    
    const wins = tradeHistory.filter(t => t.pnl > 0);
    const losses = tradeHistory.filter(t => t.pnl <= 0);
    
    const winRate = wins.length / tradeHistory.length;
    const avgWin = wins.reduce((a, t) => a + t.pnlPct, 0) / wins.length || 0;
    const avgLoss = Math.abs(losses.reduce((a, t) => a + t.pnlPct, 0) / losses.length || 0);
    
    return {
      winRate: winRate.toFixed(3),
      avgWin: avgWin.toFixed(3),
      avgLoss: avgLoss.toFixed(3),
      updatedKelly: this.calculateKellyFraction(winRate, avgWin, avgLoss).toFixed(3)
    };
  }
}

// Export for use in paper trading
module.exports = KellyPositionSizing;

// Demo calculation
if (require.main === module) {
  const kelly = new KellyPositionSizing(50000);
  
  console.log('=== KELLY POSITION SIZING ===\n');
  
  // Example: T1 momentum trade
  const t1Setup = {
    tier: 'T1',
    winRate: 0.58,
    avgWin: 0.12,
    avgLoss: 0.06,
    atr: 2.5,
    price: 100,
    stopLoss: 95,
    entryPrice: 100
  };
  
  console.log('T1 Momentum Trade:');
  console.log(kelly.calculatePosition(t1Setup));
  
  // Example: T2 swing trade
  const t2Setup = {
    tier: 'T2',
    winRate: 0.52,
    avgWin: 0.25,
    avgLoss: 0.10,
    atr: 4.0,
    price: 100,
    stopLoss: 92,
    entryPrice: 100
  };
  
  console.log('\nT2 Swing Trade:');
  console.log(kelly.calculatePosition(t2Setup));
  
  // Example: T3 conviction
  const t3Setup = {
    tier: 'T3',
    winRate: 0.45,
    avgWin: 2.0,
    avgLoss: 0.20,
    atr: 8.0,
    price: 100,
    stopLoss: 80,
    entryPrice: 100
  };
  
  console.log('\nT3 Conviction Trade:');
  console.log(kelly.calculatePosition(t3Setup));
}
