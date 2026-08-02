require('dotenv').config({ path: 'data/.env.local' });
const https = require('https');
const fs = require('fs');
const { PRIORITY_SCAN } = require('./universe');

const WIDE_UNIVERSE = [
  'BTC', 'ETH', 'SOL', 'XRP', 'LINK', 'ADA', 'DOT', 'MATIC', 'UNI', 'AVAX',
  'MSTR', 'MARA', 'RIOT', 'COIN', 'CLSK', 'CORZ', 'BTBT', 'WULF',
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'GOOGL', 'AMD', 'NFLX', 'AMZN', 'CRM',
  'PLTR', 'SNOW', 'CRWD', 'SHOP', 'SQ', 'ROKU', 'ZM', 'ABNB', 'UBER', 'DDOG',
  'LLY', 'NVO', 'PFE', 'MRNA', 'BNTX', 'REGN', 'VRTX', 'HIMS',
  'GME', 'AMC', 'BB', 'NOK', 'HOOD',
  'TQQQ', 'SQQQ', 'SOXL', 'SPXL', 'SPXS', 'UVXY', 'VIXY',
  'GLD', 'SLV', 'USO', 'UNG', 'DBC'
];

function getQuote(symbol) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/quote?symbol=${symbol}&apikey=${process.env.TWELVE_DATA_API_KEY}`,
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
              open: parseFloat(json.open),
              high: parseFloat(json.high),
              low: parseFloat(json.low),
              prevClose: parseFloat(json.previous_close),
              change: parseFloat(json.percent_change),
              volume: parseInt(json.volume)
            });
          } else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function getIndicators(symbol) {
  return new Promise((resolve) => {
    const indicators = ['rsi', 'ema', 'sma', 'atr'];
    const results = {};
    let completed = 0;
    
    indicators.forEach(ind => {
      const options = {
        hostname: 'api.twelvedata.com',
        path: `/${ind}?symbol=${symbol}&interval=1h&apikey=${process.env.TWELVE_DATA_API_KEY}`,
        method: 'GET'
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            results[ind] = json.value ? parseFloat(json.value) : null;
          } catch { results[ind] = null; }
          completed++;
          if (completed === indicators.length) resolve(results);
        });
      });
      req.on('error', () => { results[ind] = null; completed++; });
      req.setTimeout(2000, () => { req.destroy(); results[ind] = null; completed++; });
      req.end();
    });
  });
}

// Calculate VWAP (simplified)
function calculateVWAP(data) {
  const typicalPrice = (data.high + data.low + data.price) / 3;
  const vwapDeviation = ((data.price - typicalPrice) / typicalPrice) * 100;
  return { typicalPrice, vwapDeviation };
}

// Calculate support/resistance levels
function calculateLevels(data) {
  const pivot = (data.high + data.low + data.price) / 3;
  const r1 = (2 * pivot) - data.low;
  const s1 = (2 * pivot) - data.high;
  const r2 = pivot + (data.high - data.low);
  const s2 = pivot - (data.high - data.low);
  
  return {
    pivot,
    r1, r2,
    s1, s2,
    nearSupport: data.price < s1 * 1.02,
    nearResistance: data.price > r1 * 0.98
  };
}

function scoreSetup(data, indicators) {
  let score = 0;
  let signals = [];
  let tier = null;
  
  const vwap = calculateVWAP(data);
  const levels = calculateLevels(data);
  
  // Momentum setups (Tier 1)
  if (indicators.rsi && indicators.rsi < 35 && data.change > -5 && data.change < 0) {
    score += 3;
    signals.push('RSI_OVERSOLD');
    tier = 'T1';
  }
  
  if (indicators.rsi && indicators.rsi > 50 && indicators.rsi < 65 && data.change > 3) {
    score += 2;
    signals.push('MOMENTUM_BUILDING');
    tier = 'T1';
  }
  
  // VWAP deviation (mean reversion)
  if (Math.abs(vwap.vwapDeviation) > 2) {
    score += 1;
    signals.push(vwap.vwapDeviation > 0 ? 'ABOVE_VWAP' : 'BELOW_VWAP');
  }
  
  // Support/Resistance
  if (levels.nearSupport) {
    score += 1;
    signals.push('NEAR_SUPPORT');
  }
  
  if (levels.nearResistance) {
    score -= 1;
    signals.push('NEAR_RESISTANCE');
  }
  
  // Volume spike
  if (data.volume > 1000000) {
    score += 1;
    signals.push('HIGH_VOLUME');
  }
  
  // Volatility (ATR check)
  if (indicators.atr && indicators.atr / data.price > 0.03) {
    score += 1;
    signals.push('HIGH_VOLATILITY');
  }
  
  return {
    score,
    signals,
    tier: tier || (score >= 2 ? 'T2' : null),
    vwap: vwap.vwapDeviation.toFixed(2) + '%',
    levels: { s1: levels.s1.toFixed(2), r1: levels.r1.toFixed(2) },
    indicators: {
      rsi: indicators.rsi?.toFixed(1) || 'N/A',
      atr: indicators.atr?.toFixed(2) || 'N/A'
    }
  };
}

(async () => {
  console.log('=== ENHANCED MARKET SCANNER ===\n');
  console.log(`Scanning ${WIDE_UNIVERSE.length} symbols with volume profile + VWAP + levels...\n`);
  
  const results = [];
  const batchSize = 3;
  
  for (let i = 0; i < WIDE_UNIVERSE.length; i += batchSize) {
    const batch = WIDE_UNIVERSE.slice(i, i + batchSize);
    
    for (const symbol of batch) {
      try {
        const quote = await getQuote(symbol);
        if (!quote) continue;
        
        const indicators = await getIndicators(symbol);
        const setup = scoreSetup(quote, indicators);
        
        if (setup.score >= 2) {
          results.push({
            symbol,
            price: quote.price,
            change: quote.change,
            ...setup
          });
        }
      } catch {}
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  results.sort((a, b) => b.score - a.score);
  
  console.log('=== TOP ENHANCED SETUPS ===\n');
  
  if (results.length === 0) {
    console.log('No Tier 1/T2 setups found after enhanced scan.');
    console.log('Scanner now includes: VWAP, S/R levels, volume profile, ATR');
  } else {
    results.slice(0, 10).forEach((r, i) => {
      console.log(`${i+1}. ${r.symbol} [${r.tier}] Score: ${r.score}/7`);
      console.log(`   Price: $${r.price.toFixed(2)} | Change: ${r.change > 0 ? '+' : ''}${r.change.toFixed(2)}%`);
      console.log(`   RSI: ${r.indicators.rsi} | VWAP: ${r.vwap}`);
      console.log(`   Support: $${r.levels.s1} | Resistance: $${r.levels.r1}`);
      console.log(`   Signals: ${r.signals.join(', ')}`);
      console.log();
    });
  }
  
  fs.writeFileSync('paper_trading/enhanced_opportunities.json', JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} opportunities.`);
})();
