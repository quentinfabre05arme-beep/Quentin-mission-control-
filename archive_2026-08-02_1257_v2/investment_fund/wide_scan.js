require('dotenv').config({ path: 'data/.env.local' });
const https = require('https');

// Expanded universe - 60+ symbols
const WIDE_UNIVERSE = [
  'BTC', 'ETH', 'SOL', 'XRP', 'LINK', 'ADA', 'DOT', 'MATIC', 'UNI',
  'MSTR', 'MARA', 'RIOT', 'COIN', 'CLSK', 'CORZ', 'BTBT',
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMD', 'NFLX', 'AMZN',
  'PLTR', 'SNOW', 'CRWD', 'SHOP', 'SQ', 'ROKU', 'ZM', 'ABNB', 'UBER',
  'LLY', 'NVO', 'PFE', 'MRNA', 'BNTX', 'REGN', 'VRTX',
  'GME', 'AMC', 'BB', 'NOK',
  'TQQQ', 'SQQQ', 'SOXL', 'SPXL', 'SPXS',
  'GLD', 'SLV', 'USO', 'UNG'
];

function getQuote(symbol) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/quote?symbol=${symbol}&apikey=***}`,
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.code && json.close) {
            resolve({
              symbol,
              price: parseFloat(json.close),
              change: parseFloat(json.percent_change),
              volume: parseFloat(json.volume),
              high: parseFloat(json.high),
              low: parseFloat(json.low)
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

(async () => {
  console.log('=== WIDE MARKET SCAN ===');
  console.log(`Scanning ${WIDE_UNIVERSE.length} symbols...`);
  
  const results = [];
  
  for (let i = 0; i < WIDE_UNIVERSE.length; i += 5) {
    const batch = WIDE_UNIVERSE.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(getQuote));
    
    batchResults.forEach(data => {
      if (data) {
        let score = 0;
        let setup = '';
        
        if (data.change < -5 && data.change > -15) {
          score += 2;
          setup = 'OVERSOLD';
        } else if (data.change > 5 && data.change < 15) {
          score += 1;
          setup = 'MOMENTUM';
        }
        
        if (data.change > 8 || data.change < -8) {
          score += 1;
          setup = setup || 'EXTREME_MOVE';
        }
        
        if (score > 0) {
          results.push({ ...data, score, setup });
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 600));
  }
  
  results.sort((a, b) => b.score - a.score);
  
  console.log('\n=== TOP SETUPS ===\n');
  
  if (results.length === 0) {
    console.log('No immediate setups. Markets neutral/choppy.');
  } else {
    results.slice(0, 10).forEach((r, i) => {
      console.log(`${i+1}. ${r.symbol} [${r.setup}]`);
      console.log(`   $${r.price.toFixed(2)} | ${r.change > 0 ? '+' : ''}${r.change.toFixed(2)}%`);
      console.log(`   Score: ${r.score}`);
      console.log();
    });
  }
  
  const fs = require('fs');
  fs.writeFileSync('paper_trading/wide_opportunities.json', JSON.stringify(results, null, 2));
  
  console.log(`Saved ${results.length} opportunities.`);
})();
