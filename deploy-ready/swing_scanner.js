/**
 * SWING TRADING SCANNER
 * Analyzes multiple assets for high-probability WEAK_BUY setups
 */

const https = require('https');

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');

// Extended watchlist for swing trading
const SWING_CANDIDATES = [
  // Tech/Growth
  { symbol: 'NVDA', type: 'stock', sector: 'tech', catalyst: 'AI demand, earnings Aug 28' },
  { symbol: 'TSLA', type: 'stock', sector: 'tech', catalyst: 'Robotaxi event, deliveries' },
  { symbol: 'AAPL', type: 'stock', sector: 'tech', catalyst: 'iPhone cycle, services growth' },
  { symbol: 'AMD', type: 'stock', sector: 'tech', catalyst: 'Data center demand' },
  { symbol: 'PLTR', type: 'stock', sector: 'tech', catalyst: 'Gov contracts, AI platform' },
  
  // Healthcare/Biotech (like HIMS)
  { symbol: 'LLY', type: 'stock', sector: 'healthcare', catalyst: 'GLP-1 leader, earnings' },
  { symbol: 'NVO', type: 'stock', sector: 'healthcare', catalyst: 'Ozempic/Wegovy demand' },
  { symbol: 'UNH', type: 'stock', sector: 'healthcare', catalyst: 'Medicare Advantage' },
  { symbol: 'COIN', type: 'stock', sector: 'crypto', catalyst: 'BTC correlation, institutional' },
  
  // ETFs for diversification
  { symbol: 'SPY', type: 'etf', sector: 'broad', catalyst: 'Market direction' },
  { symbol: 'QQQ', type: 'etf', sector: 'tech', catalyst: 'Nasdaq leadership' },
  { symbol: 'ARKK', type: 'etf', sector: 'growth', catalyst: 'Innovation stocks' },
  { symbol: 'BITO', type: 'etf', sector: 'crypto', catalyst: 'BTC futures' },
  
  // Additional momentum plays
  { symbol: 'SMCI', type: 'stock', sector: 'tech', catalyst: 'AI servers, data center' },
  { symbol: 'CRWD', type: 'stock', sector: 'cyber', catalyst: 'Security demand' },
  { symbol: 'SNOW', type: 'stock', sector: 'cloud', catalyst: 'Data cloud growth' },
  { symbol: 'NET', type: 'stock', sector: 'cloud', catalyst: 'Edge computing' }
];

function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(new Error('Invalid JSON: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

async function getQuote(symbol) {
  try {
    const data = await fetchData(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`
    );
    return {
      symbol: data.symbol,
      price: parseFloat(data.close),
      change: parseFloat(data.change),
      change_pct: parseFloat(data.percent_change),
      volume: parseInt(data.volume),
      high_52w: parseFloat(data.fifty_two_week_high),
      low_52w: parseFloat(data.fifty_two_week_low),
      error: data.code ? data.message : null
    };
  } catch (e) {
    return { symbol, error: e.message };
  }
}

async function getTechnical(symbol) {
  try {
    // Fetch RSI
    const rsiData = await fetchData(
      `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=1day&time_period=14&apikey=${TWELVE_DATA_KEY}`
    );
    const rsi = rsiData.values?.[0]?.rsi ? parseFloat(rsiData.values[0].rsi) : null;
    
    // Fetch SMAs
    const sma20 = await fetchData(
      `https://api.twelvedata.com/sma?symbol=${symbol}&interval=1day&time_period=20&apikey=${TWELVE_DATA_KEY}`
    );
    const sma50 = await fetchData(
      `https://api.twelvedata.com/sma?symbol=${symbol}&interval=1day&time_period=50&apikey=${TWELVE_DATA_KEY}`
    );
    
    const sma20_val = sma20.values?.[0]?.sma ? parseFloat(sma20.values[0].sma) : null;
    const sma50_val = sma50.values?.[0]?.sma ? parseFloat(sma50.values[0].sma) : null;
    
    return { rsi, sma20: sma20_val, sma50: sma50_val };
  } catch (e) {
    return { rsi: null, sma20: null, sma50: null, error: e.message };
  }
}

function generateSignal(quote, tech, meta) {
  if (!quote || quote.error) return { signal: 'ERROR', reason: quote?.error || 'No data' };
  
  const { price, change_pct } = quote;
  const { rsi, sma20, sma50 } = tech;
  
  let score = 0;
  let factors = [];
  let reasons = [];
  
  // RSI scoring
  if (rsi !== null) {
    if (rsi < 30) { score += 2; factors.push('RSI oversold'); }
    else if (rsi < 40) { score += 1; factors.push('RSI approaching oversold'); }
    else if (rsi > 70) { score -= 2; factors.push('RSI overbought'); }
    else if (rsi > 60) { score -= 1; factors.push('RSI elevated'); }
  }
  
  // Trend scoring (price vs SMAs)
  if (sma20 && sma50) {
    if (price > sma20 && sma20 > sma50) { 
      score += 1; factors.push('Uptrend intact'); 
    }
    else if (price < sma20 && sma20 < sma50) { 
      score -= 1; factors.push('Downtrend'); 
    }
    else if (price > sma20 && price < sma50) { 
      score += 0.5; factors.push('Recovery bounce potential'); 
    }
  }
  
  // Momentum scoring
  if (change_pct > 3) { score += 1; factors.push(`Strong momentum +${change_pct.toFixed(2)}%`); }
  else if (change_pct > 1) { score += 0.5; factors.push(`Positive momentum +${change_pct.toFixed(2)}%`); }
  else if (change_pct < -3) { score -= 0.5; factors.push(`Weak momentum ${change_pct.toFixed(2)}%`); }
  
  // Determine signal
  let signal, urgency, confidence;
  
  if (score >= 3) {
    signal = 'BUY';
    urgency = 'THIS WEEK';
    confidence = 'HIGH';
  } else if (score >= 1.5) {
    signal = 'WEAK_BUY';
    urgency = 'THIS WEEK';
    confidence = 'MEDIUM';
  } else if (score <= -2) {
    signal = 'SELL';
    urgency = 'TODAY';
    confidence = 'HIGH';
  } else if (score <= -1) {
    signal = 'WEAK_SELL';
    urgency = 'THIS WEEK';
    confidence = 'MEDIUM';
  } else {
    signal = 'HOLD';
    urgency = 'NONE';
    confidence = 'LOW';
  }
  
  return {
    signal,
    score,
    factors,
    rsi,
    sma20,
    sma50,
    urgency,
    confidence
  };
}

async function scanAsset(asset, delay = 0) {
  await new Promise(r => setTimeout(r, delay));
  
  console.log(`\n🔍 Scanning ${asset.symbol}...`);
  
  const quote = await getQuote(asset.symbol);
  const tech = await getTechnical(asset.symbol);
  const signal = generateSignal(quote, tech, asset);
  
  return {
    ...asset,
    quote,
    signal
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           SWING TRADING SCANNER                                ║');
  console.log('║           Multi-Asset Opportunity Finder                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  console.log(`\n📊 Scanning ${SWING_CANDIDATES.length} assets...`);
  console.log('⏱️  Rate limit: 8 requests/minute (delaying 8s between assets)\n');
  
  const results = [];
  
  for (let i = 0; i < SWING_CANDIDATES.length; i++) {
    const result = await scanAsset(SWING_CANDIDATES[i], i * 8000); // 8s delay
    results.push(result);
  }
  
  // Sort by signal strength
  const buySignals = results.filter(r => r.signal.signal === 'BUY' || r.signal.signal === 'WEAK_BUY');
  const holdSignals = results.filter(r => r.signal.signal === 'HOLD');
  const sellSignals = results.filter(r => r.signal.signal === 'SELL' || r.signal.signal === 'WEAK_SELL');
  
  console.log('\n');
  console.log('═'.repeat(64));
  console.log('🎯 TOP SWING TRADING OPPORTUNITIES');
  console.log('═'.repeat(64));
  
  if (buySignals.length > 0) {
    console.log('\n✅ BUY / WEAK_BUY SIGNALS:');
    buySignals
      .sort((a, b) => b.signal.score - a.signal.score)
      .forEach(r => {
        const price = r.quote.price?.toFixed(2) || 'N/A';
        const change = r.quote.change_pct?.toFixed(2) || '0';
        const rsi = r.signal.rsi?.toFixed(1) || 'N/A';
        console.log(`\n   ${r.signal.signal === 'BUY' ? '⭐⭐⭐' : '⭐'} ${r.symbol} @ $${price} (${change >= 0 ? '+' : ''}${change}%)`);
        console.log(`      RSI: ${rsi} | Sector: ${r.sector} | Score: ${r.signal.score.toFixed(1)}`);
        console.log(`      Catalyst: ${r.catalyst}`);
        console.log(`      Factors: ${r.signal.factors.join(', ') || 'None'}`);
      });
  }
  
  if (holdSignals.length > 0) {
    console.log('\n⚪ HOLD SIGNALS (Watchlist):');
    holdSignals.slice(0, 5).forEach(r => {
      const price = r.quote.price?.toFixed(2) || 'N/A';
      const change = r.quote.change_pct?.toFixed(2) || '0';
      console.log(`   • ${r.symbol}: $${price} (${change}%) | ${r.catalyst}`);
    });
  }
  
  // Save results
  const output = {
    scan_date: new Date().toISOString(),
    total_scanned: SWING_CANDIDATES.length,
    buy_signals: buySignals.map(r => ({
      symbol: r.symbol,
      price: r.quote.price,
      change_pct: r.quote.change_pct,
      signal: r.signal.signal,
      score: r.signal.score,
      rsi: r.signal.rsi,
      confidence: r.signal.confidence,
      catalyst: r.catalyst,
      factors: r.signal.factors
    })),
    watchlist: holdSignals.map(r => ({
      symbol: r.symbol,
      price: r.quote.price,
      catalyst: r.catalyst
    }))
  };
  
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(
    path.join(__dirname, 'swing_scan_results.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log('\n' + '═'.repeat(64));
  console.log('✅ Results saved to: swing_scan_results.json');
  console.log('═'.repeat(64));
}

main().catch(console.error);
