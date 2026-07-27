/**
 * ADVANCED POSITION MANAGER v2.0
 * Dynamic sizing, correlation-aware, ATR-based stops
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = path.join(__dirname, 'paper_trading.json');
const TWELVE_DATA_KEY = '***';

// Correlation matrix (simplified - update with actual data)
const CORRELATION_MATRIX = {
  'BTC': { 'ETH': 0.84, 'COIN': 0.79, 'MSTR': 0.89, 'HIMS': 0.08, 'SMCI': 0.15 },
  'ETH': { 'BTC': 0.84, 'COIN': 0.76, 'MSTR': 0.75, 'HIMS': 0.12, 'SMCI': 0.18 },
  'COIN': { 'BTC': 0.79, 'ETH': 0.76, 'MSTR': 0.72, 'HIMS': 0.11, 'SMCI': 0.19 },
  'MSTR': { 'BTC': 0.89, 'ETH': 0.75, 'COIN': 0.72, 'HIMS': 0.15, 'SMCI': 0.22 },
  'HIMS': { 'BTC': 0.08, 'ETH': 0.12, 'COIN': 0.11, 'MSTR': 0.15, 'SMCI': 0.22 },
  'SMCI': { 'BTC': 0.15, 'ETH': 0.18, 'COIN': 0.19, 'MSTR': 0.22, 'HIMS': 0.22 }
};

// Historical win rates from backtest
const WIN_RATES = {
  'BUY': 1.0,
  'WEAK_BUY': 0.75,
  'HOLD': 0,
  'WATCH': 0,
  'WEAK_SELL': 0.29,
  'SELL': 0
};

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// Calculate correlation penalty for new position
function correlationPenalty(newSymbol, existingPositions) {
  let penalty = 0;
  let highCorrCount = 0;
  
  existingPositions.forEach(pos => {
    const corr = CORRELATION_MATRIX[newSymbol]?.[pos.symbol] || 
                 CORRELATION_MATRIX[pos.symbol]?.[newSymbol] || 0;
    
    if (corr > 0.7) {
      penalty += 0.25;
      highCorrCount++;
    } else if (corr > 0.5) {
      penalty += 0.15;
    }
  });
  
  return {
    multiplier: Math.max(0.5, 1 - penalty),
    highCorrCount,
    warning: highCorrCount > 0 ? `⚠️  High correlation with ${highCorrCount} position(s)` : null
  };
}

// Advanced position sizing with multiple factors
function calculateAdvancedPosition(account, setup, existingPositions) {
  const { symbol, signal, entryPrice, stopPrice, confidence, volatility } = setup;
  
  // Base size: Fixed fractional (1% risk / stop distance)
  const stopPct = Math.abs((entryPrice - stopPrice) / entryPrice * 100);
  const baseRisk = account * 0.01;
  const baseSize = baseRisk / (stopPct / 100);
  
  // Multipliers
  const winRate = WIN_RATES[signal] || 0;
  const winRateMult = winRate * 1.33; // Scale so 75% = 1.0
  
  const confidenceMult = { 'HIGH': 1.2, 'MEDIUM': 1.0, 'LOW': 0.8 }[confidence] || 1.0;
  
  const volMult = volatility ? Math.max(0.7, 1 - (volatility / 100)) : 1.0;
  
  const corrData = correlationPenalty(symbol, existingPositions);
  
  // Combined size
  const adjustedSize = baseSize * winRateMult * confidenceMult * volMult * corrData.multiplier;
  
  // Limits
  const maxSize = account * 0.15; // 15% max
  const finalSize = Math.min(adjustedSize, maxSize);
  const finalPct = finalSize / account;
  
  // Risk metrics
  const actualRisk = finalSize * (stopPct / 100);
  const riskPct = actualRisk / account;
  
  // Kelly calculation for reference
  const avgWin = setup.targetReturn || 0.07;
  const avgLoss = stopPct / 100;
  const kelly = winRate - ((1 - winRate) / (avgWin / avgLoss));
  const halfKelly = kelly / 2;
  const quarterKelly = kelly / 4;
  
  return {
    symbol,
    entryPrice,
    stopPrice,
    stopPct: stopPct.toFixed(2),
    baseSize: baseSize.toFixed(2),
    adjustedSize: adjustedSize.toFixed(2),
    finalSize: finalSize.toFixed(2),
    finalPct: (finalPct * 100).toFixed(1),
    shares: Math.floor(finalSize / entryPrice),
    actualRisk: actualRisk.toFixed(2),
    riskPct: (riskPct * 100).toFixed(2),
    multipliers: {
      winRate: winRateMult.toFixed(2),
      confidence: confidenceMult.toFixed(1),
      volatility: volMult.toFixed(2),
      correlation: corrData.multiplier.toFixed(2)
    },
    kelly: {
      full: (kelly * 100).toFixed(1),
      half: (halfKelly * 100).toFixed(1),
      quarter: (quarterKelly * 100).toFixed(1)
    },
    warning: corrData.warning,
    quality: parseFloat(finalPct) >= 0.10 ? '✅ EXCELLENT' :
             parseFloat(finalPct) >= 0.08 ? '🟢 GOOD' :
             parseFloat(finalPct) >= 0.06 ? '🟡 ACCEPTABLE' : '🔴 SMALL'
  };
}

// Tiered entry plan
function createTieredEntry(fullPosition, stages = 3) {
  const tiers = [];
  
  if (stages === 3) {
    // 50% / 30% / 20%
    tiers.push({ pct: 0.50, size: fullPosition * 0.50, trigger: 'Initial signal' });
    tiers.push({ pct: 0.30, size: fullPosition * 0.30, trigger: '+2% confirmation' });
    tiers.push({ pct: 0.20, size: fullPosition * 0.20, trigger: '+5% breakout' });
  } else if (stages === 2) {
    // 60% / 40%
    tiers.push({ pct: 0.60, size: fullPosition * 0.60, trigger: 'Initial signal' });
    tiers.push({ pct: 0.40, size: fullPosition * 0.40, trigger: '+3% move' });
  }
  
  return tiers;
}

// ATR-based stop calculation
function calculateATRStop(entryPrice, atr14, multiplier = 2) {
  const stopDistance = atr14 * multiplier;
  const stopPrice = entryPrice - stopDistance;
  const stopPct = (stopDistance / entryPrice) * 100;
  
  return {
    price: stopPrice.toFixed(2),
    distance: stopDistance.toFixed(2),
    pct: stopPct.toFixed(2),
    atr: atr14.toFixed(2),
    multiplier
  };
}

// Portfolio heat calculation
function calculatePortfolioHeat(positions) {
  let totalHeat = 0;
  
  positions.forEach(pos => {
    const positionPct = pos.cost_basis / 100000; // Assuming $100K account
    const stopPct = Math.abs((pos.entry_price - pos.stop_loss) / pos.entry_price);
    const heat = positionPct * stopPct;
    totalHeat += heat;
  });
  
  return {
    totalHeat: (totalHeat * 100).toFixed(2),
    status: totalHeat < 0.04 ? '🟢 Safe' : 
            totalHeat < 0.06 ? '🟡 Warm' : 
            totalHeat < 0.08 ? '🟠 Hot' : '🔴 DANGER',
    maxPositions: totalHeat < 0.04 ? 8 : 
                  totalHeat < 0.06 ? 6 : 
                  totalHeat < 0.08 ? 4 : 2
  };
}

// Main analysis function
function analyzeNewPosition(symbol, signal, entryPrice, stopPrice, confidence, volatility) {
  const state = loadState();
  const existingPositions = state?.positions || [];
  
  const setup = {
    symbol,
    signal,
    entryPrice,
    stopPrice,
    confidence,
    volatility,
    targetReturn: 0.07 // Assume 7% target
  };
  
  const sizing = calculateAdvancedPosition(100000, setup, existingPositions);
  const tiered = createTieredEntry(parseFloat(sizing.finalSize));
  const heat = calculatePortfolioHeat(existingPositions);
  
  return {
    sizing,
    tiered,
    heat,
    recommendation: sizing.quality.includes('EXCELLENT') || sizing.quality.includes('GOOD') 
      ? '✅ PROCEED with tiered entry'
      : sizing.quality.includes('ACCEPTABLE')
      ? '🟡 PROCEED with caution'
      : '🔴 REJECT or reduce size'
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'analyze') {
    // Usage: node advanced_position_manager.js analyze SYMBOL SIGNAL ENTRY STOP CONFIDENCE [VOLATILITY]
    const symbol = args[1];
    const signal = args[2]?.toUpperCase();
    const entry = parseFloat(args[3]);
    const stop = parseFloat(args[4]);
    const confidence = args[5]?.toUpperCase() || 'MEDIUM';
    const volatility = parseFloat(args[6]) || 25;
    
    if (!symbol || !signal || !entry || !stop) {
      console.log('Usage: analyze SYMBOL SIGNAL ENTRY STOP CONFIDENCE [VOLATILITY]');
      console.log('Example: analyze SMCI WEAK_BUY 26.89 24.5 MEDIUM 30');
      return;
    }
    
    const result = analyzeNewPosition(symbol, signal, entry, stop, confidence, volatility);
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     ADVANCED POSITION ANALYSIS v2.0                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    console.log('\n📊 Position Sizing:');
    console.log(`   Symbol: ${result.sizing.symbol}`);
    console.log(`   Entry: $${result.sizing.entryPrice} | Stop: $${result.sizing.stopPrice} (-${result.sizing.stopPct}%)`);
    console.log(`   Shares: ${result.sizing.shares}`);
    console.log(`   Cost: $${result.sizing.finalSize} (${result.sizing.finalPct}%)`);
    console.log(`   Risk: $${result.sizing.actualRisk} (${result.sizing.riskPct}%)`);
    
    console.log('\n📈 Multipliers Applied:');
    console.log(`   Win Rate: ${result.sizing.multipliers.winRate}x`);
    console.log(`   Confidence: ${result.sizing.multipliers.confidence}x`);
    console.log(`   Volatility: ${result.sizing.multipliers.volatility}x`);
    console.log(`   Correlation: ${result.sizing.multipliers.correlation}x`);
    
    if (result.sizing.warning) {
      console.log(`\n⚠️  ${result.sizing.warning}`);
    }
    
    console.log('\n🎯 Kelly Criterion Reference:');
    console.log(`   Full Kelly: ${result.sizing.kelly.full}% (theoretical max)`);
    console.log(`   Half Kelly: ${result.sizing.kelly.half}% (aggressive)`);
    console.log(`   Quarter Kelly: ${result.sizing.kelly.quarter}% (conservative)`);
    console.log(`   Your Size: ${result.sizing.finalPct}% (practical)`);
    
    console.log('\n📋 Tiered Entry Plan:');
    result.tiered.forEach((tier, i) => {
      console.log(`   Stage ${i+1}: ${(tier.pct*100).toFixed(0)}% = $${tier.size.toFixed(2)} (${tier.trigger})`);
    });
    
    console.log('\n🔥 Portfolio Heat:');
    console.log(`   Current: ${result.heat.totalHeat}% ${result.heat.status}`);
    console.log(`   Max positions recommended: ${result.heat.maxPositions}`);
    
    console.log('\n✅ RECOMMENDATION:');
    console.log(`   ${result.recommendation}`);
    console.log('');
    
    // Save to file
    const output = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'position_analysis.json'),
      JSON.stringify(output, null, 2)
    );
    
    console.log('💾 Saved to: position_analysis.json\n');
    
  } else if (args[0] === 'heat') {
    const state = loadState();
    const heat = calculatePortfolioHeat(state?.positions || []);
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     PORTFOLIO HEAT CHECK                                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n🔥 Current Heat: ${heat.totalHeat}% ${heat.status}`);
    console.log(`📊 Max Positions: ${heat.maxPositions}`);
    console.log('');
    
  } else {
    console.log('Commands:');
    console.log('  analyze SYMBOL SIGNAL ENTRY STOP CONFIDENCE [VOLATILITY]');
    console.log('  heat');
    console.log('');
    console.log('Examples:');
    console.log('  node advanced_position_manager.js analyze SMCI WEAK_BUY 26.89 24.5 MEDIUM 30');
    console.log('  node advanced_position_manager.js heat');
  }
}

module.exports = {
  calculateAdvancedPosition,
  correlationPenalty,
  calculatePortfolioHeat,
  createTieredEntry,
  analyzeNewPosition
};

if (require.main === module) {
  main();
}
