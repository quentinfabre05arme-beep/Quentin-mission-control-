/**
 * POSITION SIZING CALCULATOR
 * Risk-appropriate position sizing for swing trading
 */

const fs = require('fs');
const path = require('path');

function calculatePosition(account, signal, entryPrice, stopPrice, confidence = 'MEDIUM') {
  const stopPct = Math.abs((entryPrice - stopPrice) / entryPrice * 100);
  
  // Base: 1% risk per trade
  const baseRisk = account * 0.01;
  
  // Confidence multiplier
  const confidenceMult = {
    'HIGH': 1.2,
    'MEDIUM': 1.0,
    'LOW': 0.8
  }[confidence] || 1.0;
  
  // Signal quality multiplier (based on backtest)
  const signalMult = {
    'BUY': 1.5,      // 100% win rate in backtest
    'WEAK_BUY': 1.0, // 73-79% win rate
    'HOLD': 0,
    'WATCH': 0,
    'WEAK_SELL': -1, // Avoid
    'SELL': -1       // Avoid
  }[signal] || 0;
  
  if (signalMult <= 0) {
    return {
      action: 'DO_NOT_TRADE',
      reason: signal === 'HOLD' ? 'Wait for WEAK_BUY or BUY signal' : 
              signal.includes('SELL') ? 'Sell signals have 0-29% win rate' :
              'Signal not tradeable'
    };
  }
  
  // Calculate position
  const adjustedRisk = baseRisk * confidenceMult * signalMult;
  const positionDollars = adjustedRisk / (stopPct / 100);
  const positionPct = positionDollars / account;
  
  // Apply limits
  const cappedPct = Math.min(positionPct, 0.15); // Max 15%
  const finalDollars = Math.min(positionDollars, account * 0.15);
  const shares = Math.floor(finalDollars / entryPrice);
  const actualDollars = shares * entryPrice;
  
  // Risk metrics
  const actualRisk = actualDollars * (stopPct / 100);
  const riskPct = actualRisk / account * 100;
  const targetDollars = actualDollars * 1.07; // Assume 7% target
  
  return {
    action: 'TRADE',
    symbol: null, // Set by caller
    entryPrice,
    stopPrice,
    shares,
    cost: actualDollars,
    positionPct: (actualDollars / account * 100).toFixed(1),
    stopPct: stopPct.toFixed(2),
    riskDollars: actualRisk.toFixed(2),
    riskPct: riskPct.toFixed(2),
    target: (entryPrice * 1.07).toFixed(2),
    rRatio: (7 / stopPct).toFixed(2),
    confidence,
    signal
  };
}

function printCalculation(calc) {
  if (calc.action === 'DO_NOT_TRADE') {
    console.log(`\n❌ DO NOT TRADE`);
    console.log(`   Reason: ${calc.reason}`);
    return;
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     POSITION SIZING CALCULATION                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Trade Setup:`);
  console.log(`   Entry: $${calc.entryPrice}`);
  console.log(`   Stop:  $${calc.stopPrice} (-${calc.stopPct}%)`);
  console.log(`   Signal: ${calc.signal} (${calc.confidence} confidence)`);
  
  console.log(`\n💰 Position Size:`);
  console.log(`   Shares: ${calc.shares}`);
  console.log(`   Cost: $${calc.cost.toLocaleString()}`);
  console.log(`   Position: ${calc.positionPct}% of account`);
  
  console.log(`\n🎯 Risk Metrics:`);
  console.log(`   Risk: $${calc.riskDollars} (${calc.riskPct}% of account)`);
  console.log(`   Target: $${calc.target}`);
  console.log(`   R:R Ratio: ${calc.rRatio}:1`);
  
  console.log('\n' + '─'.repeat(60));
  
  // Quality check
  const quality = parseFloat(calc.rRatio) >= 2 ? '✅ EXCELLENT' :
                  parseFloat(calc.rRatio) >= 1.5 ? '🟢 GOOD' :
                  parseFloat(calc.rRatio) >= 1 ? '🟡 ACCEPTABLE' :
                  '🔴 POOR (tighten stop or skip)';
  
  console.log(`\nQuality: ${quality}`);
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: node position_sizing_calculator.js <account> <signal> <entry> <stop> [confidence]');
    console.log('');
    console.log('Example:');
    console.log('  node position_sizing_calculator.js 100000 WEAK_BUY 37.17 35 HIGH');
    console.log('  node position_sizing_calculator.js 100000 BUY 26.89 24.5 MEDIUM');
    console.log('');
    console.log('Signals: BUY, WEAK_BUY, HOLD, WATCH, WEAK_SELL, SELL');
    console.log('Confidence: HIGH, MEDIUM, LOW');
    return;
  }
  
  const account = parseFloat(args[0]);
  const signal = args[1].toUpperCase();
  const entry = parseFloat(args[2]);
  const stop = parseFloat(args[3]);
  const confidence = (args[4] || 'MEDIUM').toUpperCase();
  
  const calc = calculatePosition(account, signal, entry, stop, confidence);
  calc.symbol = args[5] || 'UNKNOWN';
  
  printCalculation(calc);
  
  // Save to file
  const output = {
    timestamp: new Date().toISOString(),
    ...calc
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'position_calculation.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log('\n✅ Saved to: position_calculation.json\n');
}

// If run directly
if (require.main === module) {
  main();
}

module.exports = { calculatePosition, printCalculation };
