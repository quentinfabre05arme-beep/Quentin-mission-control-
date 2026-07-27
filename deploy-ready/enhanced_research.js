/**
 * ENHANCED FULL RESEARCH v2.0
 * Combines: Enhanced Prices + Enhanced TA + Enhanced Sentiment
 * With better caching, parallel execution, and accuracy
 */

const { fetchAllEnhanced } = require('./enhanced_market_service');
const { analyzeEnhanced: analyzeTA } = require('./enhanced_ta_analysis');
const { analyzeSentimentEnhanced } = require('./enhanced_sentiment');

async function enhancedResearch(symbol) {
  const startTime = Date.now();
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`   ENHANCED RESEARCH v2.0: ${symbol}`);
  console.log(`═══════════════════════════════════════════════════════`);
  
  // Run all analyses in parallel
  const [marketData, taData, sentimentData] = await Promise.allSettled([
    fetchAllEnhanced().then(d => d.assets[symbol]),
    analyzeTA(symbol),
    analyzeSentimentEnhanced(symbol)
  ]);
  
  const results = {
    symbol,
    timestamp: new Date().toISOString(),
    total_time_ms: Date.now() - startTime,
    data: {
      price: marketData.status === 'fulfilled' ? marketData.value : null,
      technical: taData.status === 'fulfilled' ? taData.value : null,
      sentiment: sentimentData.status === 'fulfilled' ? sentimentData.value : null
    },
    errors: []
  };
  
  if (marketData.status === 'rejected') {
    results.errors.push(`Market data: ${marketData.reason.message}`);
  }
  if (taData.status === 'rejected') {
    results.errors.push(`TA: ${taData.reason.message}`);
  }
  if (sentimentData.status === 'rejected') {
    results.errors.push(`Sentiment: ${sentimentData.reason.message}`);
  }
  
  // Calculate enhanced composite score
  results.composite = calculateEnhancedComposite(results.data);
  
  return results;
}

function calculateEnhancedComposite(data) {
  let score = 0;
  const factors = [];
  const details = {};
  
  // Price momentum (weight: 25%)
  if (data.price?.change_24h) {
    const change = data.price.change_24h;
    const momentumScore = change > 10 ? 3 : change > 5 ? 2 : change > 2 ? 1 : 
                          change < -10 ? -3 : change < -5 ? -2 : change < -2 ? -1 : 0;
    score += momentumScore * 0.25;
    factors.push(`Momentum: ${change.toFixed(2)}% (${momentumScore > 0 ? '+' : ''}${momentumScore})`);
    details.momentum = { change, score: momentumScore };
  }
  
  // Technical analysis (weight: 35%)
  if (data.technical?.composite) {
    const tc = data.technical.composite;
    let taScore = 0;
    
    // Convert rating to score
    const ratingScores = {
      'STRONG_BUY': 3, 'BUY': 2, 'WEAK_BUY': 1,
      'HOLD': 0,
      'WEAK_SELL': -1, 'SELL': -2, 'STRONG_SELL': -3
    };
    taScore = ratingScores[tc.rating] || 0;
    
    score += taScore * 0.35;
    factors.push(`Technical: ${tc.rating} (conf: ${tc.confidence})`);
    details.technical = { rating: tc.rating, score: taScore, confidence: tc.confidence };
  }
  
  // Sentiment (weight: 25%)
  if (data.sentiment?.summary) {
    const s = parseFloat(data.sentiment.summary.rawScore);
    const sentimentScore = s > 1.5 ? 3 : s > 0.5 ? 2 : s > 0 ? 1 :
                           s < -1.5 ? -3 : s < -0.5 ? -2 : s < 0 ? -1 : 0;
    score += sentimentScore * 0.25;
    factors.push(`Sentiment: ${data.sentiment.summary.rating}`);
    details.sentiment = { raw: s, score: sentimentScore };
  }
  
  // Trend alignment bonus (weight: 15%)
  let alignmentScore = 0;
  if (data.technical?.signals?.trend && data.sentiment?.summary) {
    const trend = data.technical.signals.trend.trend;
    const sentiment = parseFloat(data.sentiment.summary.rawScore);
    
    // Bonus for trend/sentiment alignment
    if ((trend.includes('UP') && sentiment > 0) || (trend.includes('DOWN') && sentiment < 0)) {
      alignmentScore = 1;
    } else if ((trend.includes('UP') && sentiment < 0) || (trend.includes('DOWN') && sentiment > 0)) {
      alignmentScore = -1;
    }
    
    score += alignmentScore * 0.15;
    factors.push(`Alignment: ${alignmentScore > 0 ? 'Confirmed' : alignmentScore < 0 ? 'Contradiction' : 'Neutral'}`);
    details.alignment = { trend, sentiment, score: alignmentScore };
  }
  
  // Determine final rating
  const finalScore = Math.round(score);
  let rating;
  let action;
  let urgency;
  
  if (finalScore >= 3) { rating = 'STRONG BUY'; action = 'ACCUMULATE'; urgency = 'IMMEDIATE'; }
  else if (finalScore >= 2) { rating = 'BUY'; action = 'ENTER'; urgency = 'TODAY'; }
  else if (finalScore >= 1) { rating = 'WEAK BUY'; action = 'WATCH'; urgency = 'THIS WEEK'; }
  else if (finalScore >= -1) { rating = 'HOLD'; action = 'MONITOR'; urgency = 'NONE'; }
  else if (finalScore >= -2) { rating = 'WEAK SELL'; action = 'REDUCE'; urgency = 'THIS WEEK'; }
  else if (finalScore >= -3) { rating = 'SELL'; action = 'EXIT'; urgency = 'TODAY'; }
  else { rating = 'STRONG SELL'; action = 'EXIT NOW'; urgency = 'IMMEDIATE'; }
  
  // Calculate overall confidence
  const confidences = [];
  if (data.technical?.composite?.confidence) confidences.push(data.technical.composite.confidence);
  if (data.sentiment?.summary?.confidence) confidences.push(parseFloat(data.sentiment.summary.confidence) > 0.5 ? 'HIGH' : 'LOW');
  
  const confidence = confidences.length >= 2 ? 'HIGH' : confidences.length >= 1 ? 'MEDIUM' : 'LOW';
  
  return {
    score: finalScore,
    rawScore: score.toFixed(2),
    rating,
    action,
    urgency,
    confidence,
    factors,
    details
  };
}

function formatEnhancedReport(report) {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║     ENHANCED RESEARCH REPORT v2.0: ${report.symbol.padEnd(10)} ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n📅 ${new Date(report.timestamp).toLocaleString()} (${report.total_time_ms}ms)`);
  
  const d = report.data;
  
  // Price Section
  if (d.price) {
    const p = d.price;
    const change = p.change_24h >= 0 ? '+' : '';
    console.log(`\n💰 MARKET DATA (${p.source})`);
    console.log(`   Price: $${p.price?.toLocaleString()} (${change}${p.change_24h?.toFixed(2)}%)`);
    console.log(`   Signal: ${p.signal}`);
    if (p.volume) console.log(`   Volume: ${p.volume?.toLocaleString()}`);
    if (p.stale) console.log(`   ⚠️  Warning: Stale data`);
  }
  
  // Technical Section
  if (d.technical) {
    const t = d.technical;
    const c = t.composite;
    console.log(`\n📊 TECHNICAL ANALYSIS (${t.analysis_time_ms}ms)`);
    console.log(`   RSI: ${t.indicators.rsi14?.value?.toFixed(1)} (${t.signals.rsi?.rating})`);
    console.log(`   Trend: ${t.signals.trend?.trend}`);
    console.log(`   MACD: ${t.signals.macd?.rating}`);
    console.log(`   Volatility: ${t.signals.volatility?.rating} (${t.signals.volatility?.width})`);
    console.log(`   → ${c.rating} (Score: ${c.score}, ${c.confidence} confidence)`);
  }
  
  // Sentiment Section
  if (d.sentiment) {
    const s = d.sentiment;
    console.log(`\n🔮 SENTIMENT ANALYSIS (${s.analysis_time_ms}ms)`);
    console.log(`   Score: ${s.summary.score} → ${s.summary.rating}`);
    console.log(`   Recent Trend: ${s.summary.recentTrend}`);
    console.log(`   Articles: ${s.summary.positive}+ / ${s.summary.neutral}= / ${s.summary.negative}-`);
    console.log(`   Confidence: ${(s.summary.confidence * 100).toFixed(0)}%`);
    if (s.headlines[0]) {
      console.log(`   Top: "${s.headlines[0].title.substring(0, 50)}..."`);
    }
  }
  
  // Composite Section
  const c = report.composite;
  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`🎯 COMPOSITE ASSESSMENT`);
  console.log(`   Score: ${c.score} (raw: ${c.rawScore})`);
  console.log(`   Rating: ${c.rating}`);
  console.log(`   Action: ${c.action} (${c.urgency})`);
  console.log(`   Confidence: ${c.confidence}`);
  console.log(`\n📋 FACTORS:`);
  c.factors.forEach(f => console.log(`   • ${f}`));
  
  if (report.errors.length > 0) {
    console.log(`\n⚠️  ERRORS:`);
    report.errors.forEach(e => console.log(`   • ${e}`));
  }
  
  console.log(`\n════════════════════════════════════════════════════════════════`);
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const symbol = args[0]?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'text';
  const all = args.includes('--all');
  
  try {
    if (all) {
      // Run for all assets
      const assets = ['BTC', 'ETH', 'MSTR', 'HIMS'];
      const results = {};
      
      for (const asset of assets) {
        results[asset] = await enhancedResearch(asset);
        await new Promise(r => setTimeout(r, 1000)); // Rate limit protection
      }
      
      if (format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        Object.values(results).forEach(r => formatEnhancedReport(r));
      }
    } else {
      const report = await enhancedResearch(symbol);
      
      if (format === 'json') {
        console.log(JSON.stringify(report, null, 2));
      } else {
        formatEnhancedReport(report);
      }
    }
  } catch (e) {
    console.error(`❌ Research failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { enhancedResearch, formatEnhancedReport };

if (require.main === module) main();
