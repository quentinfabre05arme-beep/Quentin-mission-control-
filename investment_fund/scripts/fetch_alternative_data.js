#!/usr/bin/env node
/**
 * ALPHA FUND - Alternative Data Fetcher
 * Fetches early signals not visible in price data
 * 
 * Usage: node fetch_alternative_data.js [--all] [--asset BTC] [--json]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to load secret resolver, fallback to env or placeholder
let SERPER_KEY = process.env.SERPER_KEY;
if (!SERPER_KEY) {
  try {
    const secretResolver = require('../lib/secret_resolver');
    SERPER_KEY = secretResolver.getSecret('serper-api');
  } catch (e) {
    SERPER_KEY = '';
  }
}

const CONFIG = {
  SERPER_KEY,
  DATA_DIR: path.join(__dirname, '..', 'data', 'alternative'),
  MARKET_DATA_FILE: path.join(__dirname, '..', '..', 'mission_control', 'market_data.json'),
  CACHE_MINUTES: 60,
  COINGECKO_API: 'https://api.coingecko.com/api/v3'
};

// Ensure directory exists
if (!fs.existsSync(CONFIG.DATA_DIR)) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}

// Fetch Fear & Greed Index
async function fetchFearGreedIndex() {
  return new Promise((resolve) => {
    const req = https.get('https://api.alternative.me/fng/?limit=2', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const current = parsed.data[0];
          const prev = parsed.data[1];
          resolve({
            value: parseInt(current.value),
            previous_value: parseInt(prev.value),
            classification: current.value_classification.toUpperCase(),
            timestamp: new Date(current.timestamp * 1000).toISOString(),
            trend: parseInt(current.value) > parseInt(prev.value) ? 'IMPROVING' : 'DECLINING'
          });
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

// Fetch funding rates (CoinGlass free endpoint simulation via CoinGecko)
async function fetchFundingRates() {
  return new Promise((resolve) => {
    // Using CoinGecko to get market data as proxy for funding sentiment
    const req = https.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&per_page=2&page=1', {
      headers: { 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const btc = parsed.find(c => c.id === 'bitcoin');
          const eth = parsed.find(c => c.id === 'ethereum');
          
          // Simulate funding rate sentiment based on price action vs OI
          const btcSentiment = btc.price_change_24h > 0 && btc.market_cap_change_percentage_24h < btc.price_change_24h 
            ? 'POSITIVE_FUNDING' : 'NEUTRAL';
          const ethSentiment = eth.price_change_24h > 0 && eth.market_cap_change_percentage_24h < eth.price_change_24h 
            ? 'POSITIVE_FUNDING' : 'NEUTRAL';
          
          resolve({
            BTC: { 
              estimated_rate: btcSentiment === 'POSITIVE_FUNDING' ? 0.01 : 0.001,
              sentiment: btcSentiment,
              price_change_24h: btc.price_change_24h
            },
            ETH: { 
              estimated_rate: ethSentiment === 'POSITIVE_FUNDING' ? 0.008 : 0.001,
              sentiment: ethSentiment,
              price_change_24h: eth.price_change_24h
            },
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

// Fetch social sentiment from LunarCrush (free tier alternative via search)
async function fetchSocialSentiment() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      q: 'bitcoin sentiment OR ethereum sentiment OR crypto social media',
      num: 10,
      tbs: 'qdr:d'
    });

    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'X-API-KEY': CONFIG.SERPER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const results = parsed.organic?.slice(0, 5) || [];
          
          // Simple sentiment scoring based on title keywords
          const bullishWords = ['bull', 'surge', 'rally', 'breakout', 'pump', 'moon', 'adoption'];
          const bearishWords = ['bear', 'crash', 'dump', 'fear', 'sell', 'decline', 'regulation'];
          
          let bullish = 0, bearish = 0, neutral = 0;
          results.forEach(item => {
            const text = `${item.title} ${item.snippet || ''}`.toLowerCase();
            if (bullishWords.some(w => text.includes(w))) bullish++;
            else if (bearishWords.some(w => text.includes(w))) bearish++;
            else neutral++;
          });
          
          const total = bullish + bearish + neutral || 1;
          resolve({
            bullish_pct: (bullish / total * 100).toFixed(1),
            bearish_pct: (bearish / total * 100).toFixed(1),
            neutral_pct: (neutral / total * 100).toFixed(1),
            overall_sentiment: bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL',
            sources: results.map(r => r.title).slice(0, 3)
          });
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(postData);
    req.end();
  });
}

// Fetch on-chain metrics via mempool.space
async function fetchOnChainMetrics() {
  return new Promise((resolve) => {
    const req = https.get('https://mempool.space/api/mempool', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const mempool = JSON.parse(data);
          resolve({
            mempool_size: mempool.count || 0,
            mempool_vsize: mempool.vsize || 0,
            network_congestion: mempool.vsize > 50000000 ? 'HIGH' : mempool.vsize > 20000000 ? 'MEDIUM' : 'LOW',
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          resolve({ mempool_size: 'unavailable', network_congestion: 'UNKNOWN' });
        }
      });
    });
    req.on('error', () => resolve({ mempool_size: 'unavailable', network_congestion: 'ERROR' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ mempool_size: 'timeout', network_congestion: 'UNKNOWN' }); });
  });
}

// Load market data
function loadMarketData() {
  try {
    const data = fs.readFileSync(CONFIG.MARKET_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// Search for whale/on-chain news
async function fetchWhaleNews() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      q: 'bitcoin whale exchange inflows outflows accumulation',
      num: 10,
      tbs: 'qdr:d'
    });

    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/news',
      method: 'POST',
      headers: {
        'X-API-KEY': CONFIG.SERPER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.news?.slice(0, 5) || []);
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    req.write(postData);
    req.end();
  });
}

// Analyze whale news for accumulation signals
function analyzeWhaleSignals(news) {
  const accumulationWords = ['accumulating', 'holding', 'not selling', 'decline in inflows', 'outflow', 'leaving exchanges'];
  const distributionWords = ['selling', 'dumping', 'inflow', 'deposit', 'exchange inflows'];
  
  let accumulationScore = 0;
  let distributionScore = 0;
  const relevantHeadlines = [];

  news.forEach(item => {
    const text = `${item.title} ${item.snippet || ''}`.toLowerCase();
    
    accumulationWords.forEach(word => {
      if (text.includes(word)) {
        accumulationScore++;
        relevantHeadlines.push({ sentiment: 'accumulation', title: item.title });
      }
    });
    
    distributionWords.forEach(word => {
      if (text.includes(word)) {
        distributionScore++;
        relevantHeadlines.push({ sentiment: 'distribution', title: item.title });
      }
    });
  });

  const netScore = accumulationScore - distributionScore;
  return {
    signal: netScore > 1 ? 'ACCUMULATION' : netScore < -1 ? 'DISTRIBUTION' : 'NEUTRAL',
    score: netScore,
    confidence: Math.min((accumulationScore + distributionScore) / 5, 1),
    headlines: relevantHeadlines.slice(0, 5)
  };
}

// Detect anomalies
function detectAnomalies(marketData, fearGreed, whaleSignals, fundingRates, socialSentiment) {
  const flags = [];
  
  if (!marketData) return flags;

  // Fear & Greed recovery
  if (fearGreed) {
    if (fearGreed.value > 25 && fearGreed.value < 35) {
      flags.push({
        asset: 'MARKET',
        type: 'SENTIMENT_RECOVERY',
        severity: 'MEDIUM',
        description: `Fear & Greed at ${fearGreed.value} - recovering from extreme fear`,
        signal: 'CONTRARIAN_BUY',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fear & Greed extreme
    if (fearGreed.value < 20) {
      flags.push({
        asset: 'MARKET',
        type: 'EXTREME_FEAR',
        severity: 'HIGH',
        description: `Fear & Greed at ${fearGreed.value} - potential bottom signal`,
        signal: 'CONTRARIAN_BUY',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Whale accumulation
  if (whaleSignals.signal === 'ACCUMULATION' && whaleSignals.confidence > 0.4) {
    flags.push({
      asset: 'BTC',
      type: 'WHALE_ACCUMULATION',
      severity: 'HIGH',
      description: 'On-chain data suggests whale accumulation',
      signal: 'BULLISH_EARLY',
      timestamp: new Date().toISOString()
    });
  }

  // Funding rate anomalies
  if (fundingRates) {
    if (fundingRates.BTC.sentiment === 'POSITIVE_FUNDING' && fundingRates.BTC.price_change_24h > 0) {
      flags.push({
        asset: 'BTC',
        type: 'FUNDING_DIVERGENCE',
        severity: 'MEDIUM',
        description: 'Positive funding + positive price = momentum sustained',
        signal: 'BULLISH_CONFIRMATION',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Social sentiment divergence
  if (socialSentiment) {
    const bullish = parseFloat(socialSentiment.bullish_pct);
    const bearish = parseFloat(socialSentiment.bearish_pct);
    if (bullish > 60 && fearGreed?.value < 30) {
      flags.push({
        asset: 'MARKET',
        type: 'SENTIMENT_DIVERGENCE',
        severity: 'MEDIUM',
        description: 'High social sentiment but low Fear & Greed',
        signal: 'POTENTIAL_REVERSAL',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Price divergences
  Object.entries(marketData.assets || {}).forEach(([symbol, asset]) => {
    if (Math.abs(asset.change_24h) > 3) {
      flags.push({
        asset: symbol,
        type: 'VOLUME_ANOMALY',
        severity: asset.change_24h > 5 || asset.change_24h < -5 ? 'HIGH' : 'MEDIUM',
        description: `${symbol} moved ${asset.change_24h > 0 ? '+' : ''}${asset.change_24h.toFixed(2)}% in 24h`,
        signal: asset.change_24h > 0 ? 'BULLISH_MOMENTUM' : 'BEARISH_MOMENTUM',
        timestamp: new Date().toISOString()
      });
    }
  });

  return flags;
}

// Generate composite scores
function generateCompositeScores(marketData, fearGreed, whaleSignals, fundingRates) {
  const scores = {};
  
  if (!marketData) return scores;

  Object.keys(marketData.assets || {}).forEach(symbol => {
    let score = 0;
    const factors = [];

    // Price momentum
    const asset = marketData.assets[symbol];
    if (asset.change_24h > 1) { score += 0.2; factors.push('Positive 24h momentum'); }
    if (asset.change_24h < -1) { score -= 0.2; factors.push('Negative 24h momentum'); }

    // Fear & Greed impact
    if (fearGreed) {
      if (fearGreed.value < 20) {
        score += 0.4;
        factors.push('Extreme fear = strong contrarian buy');
      } else if (fearGreed.value < 30) {
        score += 0.3;
        factors.push('Extreme fear = contrarian buy opportunity');
      }
      
      if (fearGreed.trend === 'IMPROVING') {
        score += 0.1;
        factors.push('Sentiment improving');
      }
    }

    // Whale signals (BTC only)
    if (symbol === 'BTC' && whaleSignals.signal === 'ACCUMULATION') {
      score += 0.4;
      factors.push('Whale accumulation detected');
    }

    // Funding rates
    if (fundingRates && fundingRates[symbol]) {
      if (fundingRates[symbol].sentiment === 'POSITIVE_FUNDING') {
        score += 0.15;
        factors.push('Positive funding rates');
      }
    }

    scores[symbol] = {
      score: score.toFixed(2),
      rating: score > 0.5 ? 'BULLISH' : score > 0.2 ? 'SLIGHTLY_BULLISH' : score > -0.2 ? 'NEUTRAL' : score > -0.5 ? 'SLIGHTLY_BEARISH' : 'BEARISH',
      factors: factors.slice(0, 5)
    };
  });

  return scores;
}

// Main fetch function
async function fetchAlternativeData() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();
  
  console.log('🔄 Fetching alternative data for Alpha Fund...\n');

  // Fetch all data in parallel
  const [marketData, fearGreed, whaleNews, fundingRates, socialSentiment, onChain] = await Promise.all([
    Promise.resolve(loadMarketData()),
    fetchFearGreedIndex(),
    fetchWhaleNews(),
    fetchFundingRates(),
    fetchSocialSentiment(),
    fetchOnChainMetrics()
  ]);

  const whaleSignals = analyzeWhaleSignals(whaleNews);
  const anomalies = detectAnomalies(marketData, fearGreed, whaleSignals, fundingRates, socialSentiment);
  const composites = generateCompositeScores(marketData, fearGreed, whaleSignals, fundingRates);

  // Use local Paris time for date string
  const localDateStr = now.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }).replace(/\//g, '-');
  
  const report = {
    metadata: {
      fetch_timestamp: timestamp,
      local_time: now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      utc_time: now.toISOString(),
      cycle_id: `alternative-data-${localDateStr}`,
      data_sources: [
        'alternative.me (Fear & Greed)',
        'serper.dev (News & Sentiment)',
        'coingecko.com (Funding proxy)',
        'mempool.space (On-chain)',
        'market_data.json (Price)'
      ],
      focus: 'Early signals not visible in price data'
    },
    market_snapshot: marketData,
    sentiment: {
      fear_greed: fearGreed,
      social_sentiment: socialSentiment
    },
    on_chain: {
      whale_activity: whaleSignals,
      exchange_flows: { 
        status: 'PENDING_IMPLEMENTATION',
        note: 'Requires Glassnode/Chainalysis API'
      },
      network_metrics: onChain,
      mempool: onChain
    },
    order_flow: {
      funding_rates: fundingRates,
      unusual_volume: {
        BTC: marketData?.assets?.BTC?.change_24h > 5 || marketData?.assets?.BTC?.change_24h < -5 ? 'DETECTED' : 'NORMAL',
        ETH: marketData?.assets?.ETH?.change_24h > 5 || marketData?.assets?.ETH?.change_24h < -5 ? 'DETECTED' : 'NORMAL'
      }
    },
    anomalies: {
      flags: anomalies,
      count: anomalies.length,
      summary: `${anomalies.length} anomaly(s) detected`
    },
    composite_scores: composites,
    research_flags: anomalies.map(a => ({
      priority: a.severity === 'HIGH' ? 'HIGH' : a.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      asset: a.asset,
      task: `Investigate ${a.type}: ${a.description}`,
      signal: a.signal,
      timestamp: timestamp
    }))
  };

  // Save to file using local date (already declared above)
  const outputPath = path.join(CONFIG.DATA_DIR, `${localDateStr}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  return { report, outputPath };
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');

  try {
    const { report, outputPath } = await fetchAlternativeData();

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║        ALPHA FUND - ALTERNATIVE DATA REPORT              ║');
      console.log('║           Early Signals (Not in Price Data)            ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log(`\n📅 Paris Time: ${report.metadata.local_time}`);
      console.log(`🕐 UTC: ${report.metadata.utc_time}`);
      
      if (report.sentiment.fear_greed) {
        const fg = report.sentiment.fear_greed;
        const emoji = fg.value < 25 ? '💀' : fg.value < 40 ? '😰' : fg.value < 60 ? '😐' : '😊';
        const trend = fg.trend === 'IMPROVING' ? '↑' : '↓';
        console.log(`\n📊 FEAR & GREED: ${fg.value} ${fg.classification} ${emoji} ${trend}`);
        console.log(`   Previous: ${fg.previous_value} | Trend: ${fg.trend}`);
      }

      console.log(`\n🐋 WHALE SIGNALS: ${report.on_chain.whale_activity.signal}`);
      console.log(`   Confidence: ${(report.on_chain.whale_activity.confidence * 100).toFixed(0)}%`);
      
      if (report.order_flow.funding_rates) {
        const fr = report.order_flow.funding_rates;
        console.log(`\n💰 FUNDING RATES (Est.):`);
        console.log(`   BTC: ${(fr.BTC.estimated_rate * 100).toFixed(2)}% | ${fr.BTC.sentiment}`);
        console.log(`   ETH: ${(fr.ETH.estimated_rate * 100).toFixed(2)}% | ${fr.ETH.sentiment}`);
      }
      
      if (report.sentiment.social_sentiment) {
        const ss = report.sentiment.social_sentiment;
        console.log(`\n📱 SOCIAL SENTIMENT: ${ss.overall_sentiment}`);
        console.log(`   Bullish: ${ss.bullish_pct}% | Bearish: ${ss.bearish_pct}% | Neutral: ${ss.neutral_pct}%`);
      }
      
      if (report.on_chain.mempool) {
        const mp = report.on_chain.mempool;
        console.log(`\n⛓️ ON-CHAIN METRICS:`);
        console.log(`   Mempool Size: ${mp.mempool_size.toLocaleString()} txs`);
        console.log(`   Network: ${mp.network_congestion} congestion`);
      }

      console.log(`\n🚨 ANOMALIES DETECTED: ${report.anomalies.count}`);
      if (report.anomalies.count > 0) {
        report.anomalies.flags.forEach(flag => {
          const sev = flag.severity === 'HIGH' ? '🔴' : flag.severity === 'MEDIUM' ? '🟡' : '⚪';
          console.log(`   ${sev} [${flag.asset}] ${flag.type}`);
          console.log(`      └─ Signal: ${flag.signal}`);
        });
      } else {
        console.log(`   ⚪ No significant anomalies detected`);
      }

      console.log('\n📈 COMPOSITE SCORES:');
      Object.entries(report.composite_scores).forEach(([symbol, data]) => {
        const emoji = data.rating.includes('BULLISH') ? '🟢' : data.rating.includes('BEARISH') ? '🔴' : '⚪';
        console.log(`   ${emoji} ${symbol}: ${data.rating} (score: ${data.score})`);
        if (data.factors?.length > 0) {
          console.log(`      └─ ${data.factors[0]}`);
        }
      });

      console.log(`\n✅ REPORT SAVED: ${outputPath}`);
      
      // Show research flags for team
      if (report.research_flags.length > 0) {
        console.log('\n📝 RESEARCH TEAM FLAGS:');
        report.research_flags.forEach((flag, i) => {
          const icon = flag.priority === 'HIGH' ? '🔴' : '🟡';
          console.log(`   ${icon} ${flag.asset}: ${flag.task}`);
        });
      }
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

module.exports = { fetchAlternativeData };

if (require.main === module) main();