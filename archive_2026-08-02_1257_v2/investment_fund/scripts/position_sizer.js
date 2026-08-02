/**
 * POSITION SIZER — Calculates optimal position size based on conviction
 * Implements Kelly Criterion with safety adjustments
 */

const CONFIG = {
  FUND_SIZE: 10000, // $10K starting
  MAX_SINGLE_POSITION: 0.05, // 5% max
  MIN_SINGLE_POSITION: 0.005, // 0.5% min
  KELLY_FRACTION: 0.25, // Use 25% of full Kelly
  RISK_FREE_RATE: 0.02 // 2% annual
};

/**
 * Calculate Kelly Criterion position size
 * f* = (p × b - q) / b
 * Where: p = win probability, b = win/loss ratio, q = 1-p
 */
function kellyCriterion(winProb, avgWin, avgLoss) {
  const b = avgWin / avgLoss; // Win/loss ratio
  const q = 1 - winProb;
  
  const kelly = (winProb * b - q) / b;
  return Math.max(0, kelly * CONFIG.KELLY_FRACTION); // Conservative: 25% of Kelly
}

/**
 * Size position based on research confidence and asymmetry
 */
function calculatePosition(opportunity) {
  const { ticker, asymmetryScore, confidence, upside, downside, currentPrice } = opportunity;
  
  // Base size: 1% of fund
  let size = CONFIG.FUND_SIZE * 0.01;
  
  // Adjust for confidence (0.5x to 1.5x)
  const confidenceMult = 0.5 + (confidence / 100);
  
  // Adjust for asymmetry (1x to 2x, capped)
  const asymmetryMult = Math.min(asymmetryScore / 5, 2.0);
  
  // Calculate
  size = size * confidenceMult * asymmetryMult;
  
  // Apply limits
  const maxSize = CONFIG.FUND_SIZE * CONFIG.MAX_SINGLE_POSITION;
  const minSize = CONFIG.FUND_SIZE * CONFIG.MIN_SINGLE_POSITION;
  
  size = Math.max(minSize, Math.min(size, maxSize));
  
  // Shares to buy
  const shares = Math.floor(size / currentPrice);
  
  // Stop loss (floor price or -15%)
  const stopLoss = opportunity.floorPrice || (currentPrice * 0.85);
  
  // Take profit levels
  const takeProfit1 = opportunity.targetPrice * 0.5; // 50% of target
  const takeProfit2 = opportunity.targetPrice; // Full target
  
  return {
    ticker,
    positionSize: size,
    shares,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskAmount: size * ((currentPrice - stopLoss) / currentPrice),
    rewardAmount: size * ((takeProfit2 - currentPrice) / currentPrice),
    riskRewardRatio: (takeProfit2 - currentPrice) / (currentPrice - stopLoss),
    conviction: confidence,
    asymmetry: asymmetryScore
  };
}

/**
 * Display position sizing recommendations
 */
function displaySizing(opportunities) {
  console.log(`\n📊 POSITION SIZING — Fund: $${CONFIG.FUND_SIZE.toLocaleString()}\n`);
  console.log('| Ticker | Shares | Entry    | Stop     | TP1      | TP2      | Size    | R:R  | Risk $ |');
  console.log('|--------|--------|----------|----------|----------|----------|---------|------|--------|');
  
  let totalRisk = 0;
  
  for (const opp of opportunities.slice(0, 5)) {
    const sized = calculatePosition(opp);
    
    console.log(
      `| ${sized.ticker.padEnd(6)} | ${sized.shares.toString().padStart(6)} | ` +
      `$${sized.entryPrice.toFixed(2).padStart(7)} | $${sized.stopLoss.toFixed(2).padStart(7)} | ` +
      `$${sized.takeProfit1.toFixed(2).padStart(7)} | $${sized.takeProfit2.toFixed(2).padStart(7)} | ` +
      `$${(sized.positionSize/1000).toFixed(1)}K | ${sized.riskRewardRatio.toFixed(1)}x | $${sized.riskAmount.toFixed(0).padStart(5)} |`
    );
    
    totalRisk += sized.riskAmount;
  }
  
  console.log(`\n⚠️  Total portfolio at risk: $${totalRisk.toFixed(0)} (${(totalRisk/CONFIG.FUND_SIZE*100).toFixed(1)}%)`);
}

// Demo
if (require.main === module) {
  const mockOpps = [
    { ticker: 'PLTR', currentPrice: 25, targetPrice: 35, floorPrice: 18, asymmetryScore: 5.5, confidence: 80 },
    { ticker: 'NVDA', currentPrice: 203, targetPrice: 280, floorPrice: 170, asymmetryScore: 4.8, confidence: 85 },
    { ticker: 'TSLA', currentPrice: 370, targetPrice: 450, floorPrice: 300, asymmetryScore: 3.2, confidence: 60 }
  ];
  
  displaySizing(mockOpps);
}

module.exports = { calculatePosition, displaySizing, kellyCriterion };
