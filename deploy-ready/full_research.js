/**
 * FULL RESEARCH MODULE
 * Combines Technical + Fundamental + Sentiment analysis
 * Single command for complete stock assessment
 */

const { analyzeAsset: analyzeTA } = require('./ta_analysis');
const { analyzeFundamentals } = require('./fundamental_analysis');
const { analyzeSentiment } = require('./sentiment_analysis');
const { fetchAssetWithFallback } = require('./market_data_service');

async function fullResearch(symbol) {
  const results = {
    symbol,
    timestamp: new Date().toISOString(),
    sections: {}
  };
  
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`   FULL RESEARCH REPORT: ${symbol}`);
  console.log(`═══════════════════════════════════════════`);
  
  // 1. Current Price (from market data service)
  try {
    console.log('\n📊 Fetching current price...');
    const priceData = await fetchAssetWithFallback(symbol);
    results.sections.price = {
      current: priceData.price,
      change24h: priceData.change_24h,
      source: priceData.source,
      signal: priceData.signal
    };
  } catch (e) {
    results.sections.price = { error: e.message };
  }
  
  // 2. Technical Analysis (for all assets)
  try {
    console.log('\n📈 Fetching technical indicators...');
    const ta = await analyzeTA(symbol);
    results.sections.technical = ta;
  } catch (e) {
    results.sections.technical = { error: e.message };
  }
  
  // 3. Fundamental Analysis (stocks only)
  if (symbol === 'MSTR' || symbol === 'HIMS') {
    try {
      console.log('\n📋 Fetching fundamentals...');
      const fundamentals = await analyzeFundamentals(symbol);
      results.sections.fundamental = fundamentals;
    } catch (e) {
      results.sections.fundamental = { error: e.message };
    }
  } else {
    results.sections.fundamental = { note: 'Fundamental analysis for stocks only' };
  }
  
  // 4. Sentiment Analysis
  try {
    console.log('\n🔮 Fetching sentiment data...');
    const sentiment = await analyzeSentiment(symbol);
    results.sections.sentiment = sentiment;
  } catch (e) {
    results.sections.sentiment = { error: e.message };
  }
  
  // 5. Composite Score
  results.composite = calculateCompositeScore(results.sections);
  
  return results;
}

function calculateCompositeScore(sections) {
  let score = 0;
  let factors = [];
  
  // Technical contribution
  if (sections.technical?.composite) {
    const tc = sections.technical.composite;
    if (tc.overallSignal?.includes('BUY')) { score += 2; factors.push('Technical: BUY'); }
    if (tc.overallSignal?.includes('SELL')) { score -= 2; factors.push('Technical: SELL'); }
    if (tc.trend?.includes('UP')) { score += 1; factors.push('Trend: Up'); }
    if (tc.trend?.includes('DOWN')) { score -= 1; factors.push('Trend: Down'); }
  }
  
  // Sentiment contribution
  if (sections.sentiment?.summary) {
    const s = parseFloat(sections.sentiment.summary.score);
    if (s > 0.5) { score += 1; factors.push('Sentiment: Positive'); }
    if (s < -0.5) { score -= 1; factors.push('Sentiment: Negative'); }
  }
  
  // Price momentum
  if (sections.price?.change24h) {
    const change = sections.price.change24h;
    if (change > 5) { score += 1; factors.push('Momentum: Strong'); }
    if (change < -5) { score -= 1; factors.push('Momentum: Weak'); }
  }
  
  // Default if no factors
  if (factors.length === 0) factors.push('Insufficient data');
  
  let rating = 'HOLD';
  if (score >= 3) rating = 'STRONG BUY ⭐⭐⭐';
  else if (score >= 2) rating = 'BUY ⭐⭐';
  else if (score <= -3) rating = 'STRONG SELL ❌❌❌';
  else if (score <= -2) rating = 'SELL ❌❌';
  else if (score < 0) rating = 'WEAK SELL ❌';
  else if (score > 0) rating = 'WEAK BUY ⭐';
  
  return { score, rating, factors };
}

function formatReport(report) {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║     COMPLETE RESEARCH REPORT: ${report.symbol.padEnd(10)} ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`\n📅 ${new Date(report.timestamp).toLocaleString()}`);
  
  // Price Section
  const p = report.sections.price;
  if (p && !p.error) {
    console.log(`\n💰 CURRENT PRICE`);
    const change = p.change24h >= 0 ? '+' : '';
    console.log(`   $${p.current?.toLocaleString()} (${change}${p.change24h?.toFixed(2)}%)`);
    console.log(`   Signal: ${p.signal} | Source: ${p.source}`);
  }
  
  // Technical Section
  const t = report.sections.technical;
  if (t && !t.error) {
    console.log(`\n📊 TECHNICAL ANALYSIS`);
    console.log(`   RSI: ${t.indicators.rsi.value} (${t.indicators.rsi.signal.rating})`);
    console.log(`   MACD: ${t.indicators.macd.signal.rating}`);
    console.log(`   Trend: ${t.composite.trend}`);
    console.log(`   Signal: ${t.composite.overallSignal}`);
  }
  
  // Fundamental Section
  const f = report.sections.fundamental;
  if (f && !f.error && !f.note) {
    console.log(`\n📈 FUNDAMENTALS`);
    console.log(`   Market Cap: ${f.valuation?.marketCap || 'N/A'}`);
    console.log(`   P/E: ${f.valuation?.peRatio || 'N/A'}`);
    console.log(`   Profit Margin: ${f.profitability?.profitMargin || 'N/A'}`);
    console.log(`   Beta: ${f.trading?.beta || 'N/A'}`);
  }
  
  // Sentiment Section
  const s = report.sections.sentiment;
  if (s && !s.error) {
    console.log(`\n🔮 SENTIMENT`);
    console.log(`   Score: ${s.summary?.score} → ${s.summary?.rating}`);
    console.log(`   Headlines: ${s.summary?.positive}+ / ${s.summary?.neutral}= / ${s.summary?.negative}-`);
    if (s.headlines?.[0]) {
      console.log(`   Latest: "${s.headlines[0].title.substring(0, 50)}..."`);
    }
  }
  
  // Composite
  console.log(`\n🎯 COMPOSITE ASSESSMENT`);
  console.log(`   Score: ${report.composite.score}`);
  console.log(`   Rating: ${report.composite.rating}`);
  console.log(`\n   Key Factors:`);
  report.composite.factors.forEach(f => console.log(`   • ${f}`));
  
  console.log(`\n═══════════════════════════════════════════`);
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const symbol = args[0]?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'report';
  
  try {
    const report = await fullResearch(symbol);
    
    if (format === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      formatReport(report);
    }
  } catch (e) {
    console.error(`❌ Research failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { fullResearch, formatReport };

if (require.main === module) main();
