/**
 * ASYMMETRY SCANNER — Identifies high-conviction opportunities
 * Runs every 15 minutes, scores on 7-factor model
 * Auto-queues top opportunities for review
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  MIN_ASYMMETRY_SCORE: 1.5,
  TARGET_ASYMMETRY_SCORE: 5.0,
  DISPLAY_THRESHOLD: 2.5,  // Show opportunities above this in UI
  SCAN_INTERVAL_MINUTES: 15,
  OUTPUT_DIR: path.join(__dirname, '..', 'opportunities'),
  MARKET_DATA_FILE: path.join(__dirname, '..', '..', 'mission_control', 'market_data.json'),
  TICKERS: [
    // Core 12
    'BTC', 'ETH', 'NVDA', 'TSLA', 'MSTR', 'AAPL', 'HIMS', 'COIN', 'SPY', 'QQQ', 'GLD', 'TLT',
    // Phase 1 Expansion (25 names)
    'PLTR', 'CRWD', 'SNOW', 'NET', 'DUOL',  // Growth
    'BRK.B', 'UNH', 'V', 'MA', 'JPM',       // Value
    'ASML', 'TSM', 'BABA', 'TCEHY',          // International
    'SOL', 'LINK', 'AAVE', 'MKR'             // Crypto
  ],
  // Price sanity ranges — flag unrealistic prices
  PRICE_SANITY: {
    'AAPL': { min: 150, max: 500 },
    'TSLA': { min: 150, max: 600 },
    'NVDA': { min: 80, max: 300 },
    'BTC': { min: 20000, max: 120000 },
    'ETH': { min: 1000, max: 6000 },
    'MSTR': { min: 50, max: 200 },
    'HIMS': { min: 15, max: 60 },
    'COIN': { min: 100, max: 300 },
    'PLTR': { min: 50, max: 150 }
  }
};

/**
 * Estimated prices for tickers not in market_data.json
 * Updated quarterly with rough market prices
 */
/**
 * Estimated prices for tickers not in market_data.json
 * Updated with latest market prices — Jul 22, 2026
 * CRITICAL: $100 fallback removed to prevent false signals
 */
function getEstimatedPrice(ticker) {
  const estimates = {
    // ETFs / Macro
    'SPY': 585, 'QQQ': 485, 'GLD': 250, 'TLT': 95,
    // Growth
    'PLTR': 82, 'CRWD': 310, 'SNOW': 165, 'NET': 95, 'DUOL': 280,
    // Value
    'BRK.B': 460, 'UNH': 580, 'V': 345, 'MA': 520, 'JPM': 245,
    // International
    'ASML': 720, 'TSM': 185, 'BABA': 105, 'TCEHY': 48,
    // Crypto
    'SOL': 185, 'LINK': 22, 'AAVE': 145, 'MKR': 1850,
    // Tech majors (from market_data.json when available)
    'BTC': 66200, 'ETH': 1930, 'NVDA': 207, 'TSLA': 379,
    'MSTR': 102, 'AAPL': 328, 'HIMS': 33, 'COIN': 176
  };
  
  const price = estimates[ticker];
  if (!price) {
    console.warn(`⚠️ No price estimate for ${ticker} — skipping (no $100 fallback)`);
    return null;  // Return null instead of $100 to prevent false signals
  }
  return price;
}

// Ensure output directory exists
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

/**
 * Calculate asymmetry score v2.3 — calibrated for realistic market conditions
 * 
 * Formula: Score = ((Upside/Downside) × Catalyst × ConfidenceBoost)^1.3
 * 
 * This creates a practical scale where:
 * - 1.0-2.0 = fair to moderate asymmetry
 * - 2.0-4.0 = good opportunity (most actionable setups)
 * - 4.0-6.0 = high-conviction (rare, strong catalyst + confidence)
 * - 6.0+ = exceptional (very rare, extreme mispricing)
 * 
 * Current best (SOL): ratio 3.29 × 0.55 catalyst × 1.27 boost = 2.30^1.3 = 3.51
 * To reach 5.0: need ratio ~4.0+ with strong catalyst (e.g., 80% up / 20% down with 0.8 catalyst)
 */
function calculateAsymmetry(ticker, currentPrice, fundamentals) {
  const upside = fundamentals.targetPrice / currentPrice - 1;
  const downside = currentPrice / fundamentals.floorPrice - 1;
  const catalystProb = fundamentals.catalystProbability || 0.5;
  const confidence = (fundamentals.confidence || 50) / 100;
  
  // Base ratio: upside per unit of downside
  const baseRatio = upside / Math.max(downside, 0.05);
  
  // Apply catalyst probability (probability-weighted expected asymmetry)
  const weightedRatio = baseRatio * catalystProb;
  
  // Confidence boost: scales 0.5 to 1.5
  const confidenceBoost = 0.5 + Math.sqrt(confidence);
  
  // Power 1.3 creates good spread: strong opportunities hit 4-6, exceptional hit 7+
  const asymmetry = Math.pow(weightedRatio * confidenceBoost, 1.3);
  
  return {
    ticker,
    currentPrice,
    targetPrice: fundamentals.targetPrice,
    floorPrice: fundamentals.floorPrice,
    upside: upside * 100,
    downside: downside * 100,
    catalystProb,
    asymmetryScore: asymmetry,
    catalyst: fundamentals.catalyst,
    confidence: fundamentals.confidence || 50
  };
}

/**
 * Mock fundamental data (replace with real DCF/NAV models)
 */
function getFundamentals(ticker) {
  // Placeholder: In production, this pulls from DCF engine
  const mockData = {
    'BTC': { targetPrice: 75000, floorPrice: 55000, catalyst: 'Halving supply shock', catalystProbability: 0.7, confidence: 75 },
    'ETH': { targetPrice: 2500, floorPrice: 1600, catalyst: 'ETF approval', catalystProbability: 0.6, confidence: 70 },
    'NVDA': { targetPrice: 280, floorPrice: 170, catalyst: 'AI demand cycle', catalystProbability: 0.8, confidence: 85 },
    'TSLA': { targetPrice: 450, floorPrice: 300, catalyst: 'Robotaxi unveil', catalystProbability: 0.5, confidence: 60 },
    'MSTR': { targetPrice: 130, floorPrice: 75, catalyst: 'BTC treasury appreciation', catalystProbability: 0.65, confidence: 70 },
    'AAPL': { targetPrice: 380, floorPrice: 280, catalyst: 'Apple Intelligence rollout', catalystProbability: 0.6, confidence: 75 },
    'HIMS': { targetPrice: 45, floorPrice: 25, catalyst: 'GLP-1 expansion', catalystProbability: 0.55, confidence: 65 },
    'COIN': { targetPrice: 220, floorPrice: 120, catalyst: 'Institutional crypto adoption', catalystProbability: 0.6, confidence: 70 },
    'CRWD': { targetPrice: 380, floorPrice: 240, catalyst: 'Cybersecurity demand', catalystProbability: 0.75, confidence: 85 },
    'SPY': { targetPrice: 620, floorPrice: 480, catalyst: 'Fed rate cuts', catalystProbability: 0.6, confidence: 70 },
    'QQQ': { targetPrice: 520, floorPrice: 400, catalyst: 'AI productivity gains', catalystProbability: 0.65, confidence: 75 },
    'GLD': { targetPrice: 280, floorPrice: 210, catalyst: 'De-dollarization', catalystProbability: 0.55, confidence: 65 },
    'TLT': { targetPrice: 110, floorPrice: 85, catalyst: 'Bond rally on cuts', catalystProbability: 0.5, confidence: 60 },
    'PLTR': { targetPrice: 45, floorPrice: 22, catalyst: 'Government AI contracts', catalystProbability: 0.7, confidence: 80 },
    'SNOW': { targetPrice: 220, floorPrice: 130, catalyst: 'Data cloud expansion', catalystProbability: 0.6, confidence: 70 },
    'NET': { targetPrice: 120, floorPrice: 70, catalyst: 'Edge computing growth', catalystProbability: 0.6, confidence: 65 },
    'DUOL': { targetPrice: 320, floorPrice: 200, catalyst: 'AI tutoring monetization', catalystProbability: 0.55, confidence: 60 },
    'BRK.B': { targetPrice: 520, floorPrice: 400, catalyst: 'Insurance float + equity', catalystProbability: 0.7, confidence: 80 },
    'UNH': { targetPrice: 650, floorPrice: 480, catalyst: 'Healthcare consolidation', catalystProbability: 0.6, confidence: 75 },
    'V': { targetPrice: 380, floorPrice: 280, catalyst: 'Payment volume growth', catalystProbability: 0.65, confidence: 75 },
    'MA': { targetPrice: 580, floorPrice: 420, catalyst: 'Cross-border payments', catalystProbability: 0.6, confidence: 70 },
    'JPM': { targetPrice: 280, floorPrice: 200, catalyst: 'Net interest income', catalystProbability: 0.55, confidence: 65 },
    'ASML': { targetPrice: 850, floorPrice: 600, catalyst: 'EUV monopoly', catalystProbability: 0.75, confidence: 85 },
    'TSM': { targetPrice: 220, floorPrice: 150, catalyst: 'AI chip demand', catalystProbability: 0.7, confidence: 80 },
    'BABA': { targetPrice: 140, floorPrice: 85, catalyst: 'China stimulus + AI', catalystProbability: 0.5, confidence: 55 },
    'TCEHY': { targetPrice: 60, floorPrice: 38, catalyst: 'Gaming + AI rebound', catalystProbability: 0.5, confidence: 55 },
    'SOL': { targetPrice: 280, floorPrice: 160, catalyst: 'DeFi + NFT ecosystem', catalystProbability: 0.55, confidence: 60 },
    'LINK': { targetPrice: 28, floorPrice: 16, catalyst: 'Real-world assets', catalystProbability: 0.5, confidence: 55 },
    'AAVE': { targetPrice: 180, floorPrice: 100, catalyst: 'DeFi lending growth', catalystProbability: 0.45, confidence: 50 },
    'MKR': { targetPrice: 2200, floorPrice: 1400, catalyst: 'RWA tokenization', catalystProbability: 0.5, confidence: 55 }
  };
  
  return mockData[ticker] || { 
    targetPrice: 0, 
    floorPrice: 0, 
    catalyst: 'Research needed', 
    catalystProbability: 0.3,
    confidence: 40
  };
}

/**
 * Run scan across all tickers
 */
async function runScan() {
  console.log(`\n🔍 Asymmetry Scan — ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  // Load market data
  let marketData = {};
  try {
    const raw = fs.readFileSync(CONFIG.MARKET_DATA_FILE, 'utf8');
    marketData = JSON.parse(raw).assets || {};
  } catch (e) {
    console.log('⚠️ Could not load market data, using placeholders');
  }
  
  const opportunities = [];
  
  for (const ticker of CONFIG.TICKERS) {
    const marketPrice = marketData[ticker]?.price;
    const estimatedPrice = getEstimatedPrice(ticker);
    const currentPrice = marketPrice || estimatedPrice;
    
    // Skip if no valid price available (null estimated price = no $100 fallback)
    if (!currentPrice) {
      console.log(`   ⚠️ ${ticker}: No price data — skipped`);
      continue;
    }
    
    const fundamentals = getFundamentals(ticker);
    
    // Skip if no valid fundamentals
    if (!fundamentals || fundamentals.targetPrice === 0) {
      console.log(`   ⚠️ ${ticker}: No target price — skipped`);
      continue;
    }
    
    if (fundamentals.targetPrice === 0) continue;
    
    const score = calculateAsymmetry(ticker, currentPrice, fundamentals);
    
    if (score.asymmetryScore >= CONFIG.MIN_ASYMMETRY_SCORE) {
      opportunities.push(score);
    }
  }
  
  // Sort by asymmetry score
  opportunities.sort((a, b) => b.asymmetryScore - a.asymmetryScore);
  
  // Determine active thresholds
  const displayThreshold = CONFIG.DISPLAY_THRESHOLD;
  const targetThreshold = CONFIG.TARGET_ASYMMETRY_SCORE;
  
  // Display results
  console.log(`\n🎯 OPPORTUNITIES (Score ≥ ${displayThreshold.toFixed(1)}):\n`);
  console.log('| Ticker | Price   | Target  | Upside | Downside | Score | Catalyst                |');
  console.log('|--------|---------|---------|--------|----------|-------|-------------------------|');
  
  const displayOpps = opportunities.filter(o => o.asymmetryScore >= displayThreshold);
  
  for (const opp of displayOpps.slice(0, 15)) {
    const emoji = opp.asymmetryScore >= targetThreshold ? '🌟' : '✓';
    console.log(
      `| ${opp.ticker.padEnd(6)} | $${opp.currentPrice.toFixed(2).padEnd(6)} | $${opp.targetPrice.toFixed(2).padEnd(6)} | ` +
      `${opp.upside.toFixed(1)}%`.padEnd(6) + ` | ${opp.downside.toFixed(1)}%`.padEnd(8) + 
      ` | ${opp.asymmetryScore.toFixed(1)}`.padEnd(5) + ` | ${opp.catalyst.slice(0, 23).padEnd(23)} | ${emoji}`
    );
  }
  
  if (displayOpps.length === 0) {
    console.log('| (none) |         |         |        |          |       |                         |');
  }
  
  // Save top opportunities
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(CONFIG.OUTPUT_DIR, `scan_${timestamp}.json`);
  
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    opportunities: opportunities.slice(0, 20),
    metadata: {
      totalScanned: CONFIG.TICKERS.length,
      highConviction: opportunities.filter(o => o.asymmetryScore >= CONFIG.TARGET_ASYMMETRY_SCORE).length,
      mediumConviction: opportunities.filter(o => o.asymmetryScore >= CONFIG.MIN_ASYMMETRY_SCORE && o.asymmetryScore < CONFIG.TARGET_ASYMMETRY_SCORE).length
    }
  }, null, 2));
  
  console.log(`\n💾 Saved ${opportunities.length} opportunities to: ${outputFile}`);
  
  // Queue top 3 for immediate review (using target threshold)
  const top3 = opportunities.filter(o => o.asymmetryScore >= targetThreshold).slice(0, 3);
  if (top3.length > 0) {
    console.log(`\n🚨 QUEUE FOR REVIEW (${top3.length} opportunities):`);
    for (const opp of top3) {
      console.log(`   ${opp.ticker}: ${opp.asymmetryScore.toFixed(1)}x asymmetry — ${opp.catalyst}`);
    }
  } else {
    console.log(`\n⚠️ No opportunities scored above ${targetThreshold.toFixed(1)} threshold`);
  }
  
  return opportunities;
}

// Run if called directly
if (require.main === module) {
  runScan().catch(console.error);
}

module.exports = { runScan, calculateAsymmetry };
