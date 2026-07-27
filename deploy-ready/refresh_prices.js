const https = require('https');
const fs = require('fs');

const key = process.env.TWELVE_DATA_KEY || require('../lib/secret_resolver').getSecret('twelve-data-api');
const pairs = [
  { sym: 'BTC/USD', id: 'BTC' },
  { sym: 'ETH/USD', id: 'ETH' },
  { sym: 'MSTR', id: 'MSTR' },
  { sym: 'HIMS', id: 'HIMS' }
];

const results = {};
let done = 0;
const now = new Date();

function finish() {
  const payload = { timestamp: now.toISOString(), assets: {} };
  for (const p of pairs) {
    if (results[p.id] && results[p.id].price) {
      payload.assets[p.id] = results[p.id];
    }
  }
  fs.writeFileSync('market_data.json', JSON.stringify(payload, null, 2));
  console.log('Wrote market_data.json');
  console.log(JSON.stringify(payload.assets, null, 2));
}

function fetchOne(item) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(item.sym)}&apikey=${key}`;
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const j = JSON.parse(data);
        if (j.close || j.price) {
          const price = j.close ? parseFloat(j.close) : (j.price ? parseFloat(j.price) : null);
          const change = j.percent_change ? parseFloat(j.percent_change) : 0;
          if (!price) {
            results[item.id] = { error: 'no price/close field' };
          } else {
            results[item.id] = {
              price: price,
              change_24h: change,
              source: 'twelvedata',
              signal: change > 2 ? 'BULLISH' : change < -2 ? 'BEARISH' : 'NEUTRAL'
            };
          }
        } else {
          results[item.id] = { error: j.message || 'no price' };
        }
      } catch (e) {
        results[item.id] = { error: e.message };
      }
      done++;
      if (done === pairs.length) finish();
    });
  }).on('error', e => {
    results[item.id] = { error: e.message };
    done++;
    if (done === pairs.length) finish();
  });
}

// Wait 70s for rate limit reset, then stagger requests
setTimeout(() => {
  pairs.forEach((item, i) => {
    setTimeout(() => fetchOne(item), i * 1200);
  });
}, 70000);
