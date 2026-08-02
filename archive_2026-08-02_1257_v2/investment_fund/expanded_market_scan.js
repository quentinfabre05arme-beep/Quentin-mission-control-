require('dotenv').config({ path: 'data/.env.local' });
const https = require('https');
const { PRIORITY_SCAN } = require('./universe');

function getQuote(symbol) {
  return new Promise((resolve, reject) => {
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
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', () => resolve({ error: true }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ error: true });
    });
    req.end();
  });
}

function getRSI(symbol) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/rsi?symbol=${symbol}&interval=1h&time_period=14&apikey=***}`,
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(parseFloat(json.value) || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function scanSymbol(symbol) {
  try {
    const quote = await getQuote(symbol);
    if (quote.error || quote.code) return null;
    
    const price = parseFloat(quote.close || quote.price);
    const change = parseFloat(quote.percent_change);
    const volume = parseFloat(quote.volume);
    const rsi = await getRSI(symbol);
    
    return { symbol, price, change, volume, rsi };
  } catch {
    return null;
  }
}

function scoreSetup(data) {
  let score = 0;
  let tier = null;
  let rationale = '';
  
  // Oversold bounce (Tier 1)
  if (data.rsi && data.rsi < 35 && data.change > -5 && data.change < 0) {
    score += 3;
    tier = 'T1';
    rationale = `RSI oversold (${data.rsi.toFixed(1)}), potential bounce`;
  }
  
  // Momentum breakout (Tier 1)
  else if (data.rsi && data.rsi > 50 && data.rsi < 65 && data.change > 3) {
    score += 2;
    tier = 'T1';
    rationale = `Momentum breakout, RSI ${data.rsi.toFixed(1)}`;
  }
  
  // Extreme oversold (Tier 2)
  else if (data.rsi && data.rsi < 25) {
    score += 2;
    tier = 'T2';
    rationale = `Extreme oversold RSI ${data.rsi.toFixed(1)}, mean reversion play`;
  }
  
  // Strong trend continuation (Tier 2)
  else if (data.rsi && data.rsi > 55 && data.rsi < 70 && data.change > 5) {
    score += 1;
    tier = 'T2';
    rationale = `Strong trend continuation, RSI ${data.rsi.toFixed(1)}`;
  }
  
  return { score, tier, rationale };
}

(async () => {
  console.log('=== ALPHA FUND EXPANDED SCAN ===');
  console.log(`Scanning ${PRIORITY_SCAN.length} symbols...\n`);
  
  const results = [];
  const batchSize = 8;
  
  for (let i = 0; i < PRIORITY_SCAN.length; i += batchSize) {
    const batch = PRIORITY_SCAN.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(scanSymbol));
    
    batchResults.forEach(data => {
      if (data) {
        const setup = scoreSetup(data);
        if (setup.score > 0) {
          results.push({ ...data, ...setup });
        }
      }
    });
    
    // Rate limit delay
    if (i + batchSize < PRIORITY_SCAN.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  
  console.log('=== TOP SETUPS ===\n');
  
  if (results.length === 0) {
    console.log('No immediate Tier 1/T2 setups found.');
    console.log('Monitoring continues every 4 hours.');
  } else {
    results.slice(0, 5).forEach((r, i) => {
      console.log(`${i+1}. ${r.symbol} [${r.tier}]`);
      console.log(`   Price: $${r.price.toFixed(2)} | Change: ${r.change.toFixed(2)}%`);
      console.log(`   RSI: ${r.rsi ? r.rsi.toFixed(1) : 'N/A'}`);
      console.log(`   Score: ${r.score}/3`);
      console.log(`   ${r.rationale}`);
      console.log();
    });
  }
  
  // Save opportunities
  const fs = require('fs');
  fs.writeFileSync('paper_trading/opportunities.json', JSON.stringify(results.slice(0, 5), null, 2));
  
  console.log('Scan complete. Opportunities saved.');
})();
