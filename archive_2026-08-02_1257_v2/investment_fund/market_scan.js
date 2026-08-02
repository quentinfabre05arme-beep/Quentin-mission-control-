const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'data', '.env.local') });
const https = require('https');

const SYMBOLS = ['BTC', 'ETH', 'MSTR', 'HIMS'];
const API_KEY = process.env.TWELVE_DATA_API_KEY;

function getQuote(symbol) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/quote?symbol=${symbol}&apikey=${API_KEY}`,
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
    req.on('error', reject);
    req.end();
  });
}

function getRSI(symbol) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/rsi?symbol=${symbol}&interval=1h&apikey=${API_KEY}`,
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ value: null });
        }
      });
    });
    req.on('error', () => resolve({ value: null }));
    req.end();
  });
}

(async () => {
  console.log('=== ALPHA FUND MARKET SCAN ===\n');
  const opportunities = [];
  
  for (const symbol of SYMBOLS) {
    try {
      const quote = await getQuote(symbol);
      const rsi = await getRSI(symbol);
      
      const price = parseFloat(quote.close || quote.price);
      const change = parseFloat(quote.percent_change);
      const volume = parseFloat(quote.volume);
      const rsiValue = rsi.value ? parseFloat(rsi.value) : null;
      
      let signal = 'HOLD';
      let tier = null;
      let rationale = '';
      
      // Oversold bounce setup (Tier 1 - Short term)
      if (rsiValue && rsiValue < 35 && change > -5 && change < 0) {
        signal = 'BUY';
        tier = 'T1';
        rationale = `RSI oversold (${rsiValue.toFixed(1)}), negative momentum slowing, potential bounce`;
      }
      
      // Momentum continuation (Tier 1)
      else if (rsiValue && rsiValue > 50 && rsiValue < 65 && change > 2) {
        signal = 'BUY';
        tier = 'T1';
        rationale = `Momentum building, RSI healthy (${rsiValue.toFixed(1)}), volume expansion`;
      }
      
      // Extreme moves (Watch)
      else if (Math.abs(change) > 8) {
        signal = 'WATCH';
        tier = 'T2';
        rationale = `Extreme move ${change.toFixed(1)}%, wait for consolidation`;
      }
      
      console.log(`${symbol}:`);
      console.log(`  Price: $${price.toFixed(2)}`);
      console.log(`  Change: ${change.toFixed(2)}%`);
      console.log(`  RSI(1h): ${rsiValue ? rsiValue.toFixed(1) : 'N/A'}`);
      console.log(`  Signal: ${signal}${tier ? ` [${tier}]` : ''}`);
      if (rationale) console.log(`  Rationale: ${rationale}`);
      console.log();
      
      if (signal === 'BUY') {
        opportunities.push({
          symbol,
          price,
          change,
          rsi: rsiValue,
          tier,
          rationale
        });
      }
      
    } catch (err) {
      console.log(`${symbol}: Error - ${err.message}`);
    }
  }
  
  console.log('=== OPPORTUNITIES ===');
  if (opportunities.length === 0) {
    console.log('No immediate setups. Monitoring...');
  } else {
    opportunities.forEach((opp, i) => {
      console.log(`${i+1}. ${opp.symbol} @ $${opp.price.toFixed(2)} [${opp.tier}]`);
      console.log(`   ${opp.rationale}`);
    });
  }
  
  const path = require('path');
  const fs = require('fs');
  fs.writeFileSync(path.join(__dirname, 'paper_trading', 'opportunities.json'), JSON.stringify(opportunities, null, 2));
})();
