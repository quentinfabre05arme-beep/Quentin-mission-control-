/**
 * QUICK SWING SCANNER - Limited assets to respect API limits
 */

const https = require('https');

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');

// Focus on highest-probability candidates
const PRIORITY_ASSETS = [
  { symbol: 'NVDA', sector: 'AI/Tech', catalyst: 'AI demand, earnings Aug 28' },
  { symbol: 'TSLA', sector: 'EV/Tech', catalyst: 'Robotaxi event' },
  { symbol: 'LLY', sector: 'Healthcare', catalyst: 'GLP-1 leader' },
  { symbol: 'COIN', sector: 'Crypto', catalyst: 'BTC correlation' },
  { symbol: 'SPY', sector: 'Broad Market', catalyst: 'Market direction' },
  { symbol: 'QQQ', sector: 'Tech ETF', catalyst: 'Nasdaq leadership' },
  { symbol: 'SMCI', sector: 'AI Servers', catalyst: 'Data center demand' },
  { symbol: 'PLTR', sector: 'AI/Defense', catalyst: 'Gov contracts' }
];

function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}

async function analyze(symbol) {
  try {
    // Get quote
    const quote = await fetchData(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`
    );
    
    // Get RSI
    const rsiData = await fetchData(
      `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=1day&time_period=14&apikey=${TWELVE_DATA_KEY}`
    );
    const rsi = rsiData.values?.[0]?.rsi ? parseFloat(rsiData.values[0].rsi) : null;
    
    return {
      symbol,
      price: parseFloat(quote.close),
      change: parseFloat(quote.percent_change),
      volume: parseInt(quote.volume),
      rsi,
      high_52w: parseFloat(quote.fifty_two_week_high),
      low_52w: parseFloat(quote.fifty_two_week_low)
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

function scoreSetup(data) {
  if (data.error) return { ...data, setup_score: -999 };
  
  let score = 0;
  const reasons = [];
  
  // RSI scoring (mean reversion)
  if (data.rsi) {
    if (data.rsi < 35) { score += 3; reasons.push(`RSI oversold ${data.rsi.toFixed(1)}`); }
    else if (data.rsi < 45) { score += 2; reasons.push(`RSI low ${data.rsi.toFixed(1)}`); }
    else if (data.rsi > 70) { score -= 2; reasons.push(`RSI overbought ${data.rsi.toFixed(1)}`); }
  }
  
  // Momentum scoring
  if (data.change > 4) { score += 2; reasons.push(`Strong momentum +${data.change.toFixed(1)}%`); }
  else if (data.change > 2) { score += 1; reasons.push(`Positive momentum +${data.change.toFixed(1)}%`); }
  else if (data.change < -3) { score -= 1; reasons.push(`Weak momentum ${data.change.toFixed(1)}%`); }
  
  // 52-week position
  const range_pct = (data.price - data.low_52w) / (data.high_52w - data.low_52w) * 100;
  if (range_pct < 20) { score += 1; reasons.push('Near 52w low (bounce potential)'); }
  else if (range_pct > 90) { score -= 1; reasons.push('Near 52w high (extended)'); }
  
  return { ...data, setup_score: score, reasons, range_pct };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     QUICK SWING SCAN - Priority Opportunities               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  for (const asset of PRIORITY_ASSETS) {
    console.log(`\n🔍 Analyzing ${asset.symbol}...`);
    const data = await analyze(asset.symbol);
    const scored = scoreSetup(data);
    results.push({ ...scored, ...asset });
    
    // Rate limit protection
    await new Promise(r => setTimeout(r, 8000));
  }
  
  // Sort by score
  results.sort((a, b) => b.setup_score - a.setup_score);
  
  console.log('\n' + '═'.repeat(64));
  console.log('🎯 TOP SWING SETUPS (Ranked by Score)');
  console.log('═'.repeat(64));
  
  const topSetups = results.filter(r => r.setup_score >= 2);
  const watchlist = results.filter(r => r.setup_score >= 0 && r.setup_score < 2);
  const avoid = results.filter(r => r.setup_score < 0);
  
  if (topSetups.length > 0) {
    console.log('\n✅ HIGH-PROBABILITY SETUPS (Score ≥2):\n');
    topSetups.forEach((r, i) => {
      console.log(`${i+1}. ${'⭐'.repeat(Math.min(3, Math.floor(r.setup_score)))} ${r.symbol}`);
      console.log(`   Price: $${r.price?.toFixed(2)} (${r.change >= 0 ? '+' : ''}${r.change?.toFixed(2)}%)`);
      console.log(`   RSI: ${r.rsi?.toFixed(1) || 'N/A'} | Setup Score: ${r.setup_score}`);
      console.log(`   Sector: ${r.sector}`);
      console.log(`   Catalyst: ${r.catalyst}`);
      console.log(`   Reasons: ${r.reasons.join(', ')}`);
      console.log();
    });
  }
  
  if (watchlist.length > 0) {
    console.log('\n⚪ WATCHLIST (Score 0-1):');
    watchlist.forEach(r => {
      console.log(`   • ${r.symbol}: Score ${r.setup_score} | ${r.reasons.join(', ') || 'Neutral setup'}`);
    });
  }
  
  if (avoid.length > 0) {
    console.log('\n❌ AVOID (Score <0):');
    avoid.forEach(r => {
      console.log(`   • ${r.symbol}: Score ${r.setup_score} | ${r.reasons.join(', ')}`);
    });
  }
  
  // Save results
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(
    path.join(__dirname, 'quick_scan_results.json'),
    JSON.stringify({
      scan_time: new Date().toISOString(),
      high_probability: topSetups,
      watchlist,
      avoid
    }, null, 2)
  );
  
  console.log('\n' + '═'.repeat(64));
  console.log('✅ Saved to: quick_scan_results.json');
  console.log('═'.repeat(64));
}

main().catch(console.error);
