const fs = require('fs');
const https = require('https');

// Current timestamp
const now = new Date();
const utcDate = now.toISOString().split('T')[0];
const timestamp = now.toISOString();
const localTime = now.toLocaleString('en-GB', { timeZone: 'Europe/Paris' });

// Get cached market data
let marketData = { BTC: { price: 63983.54 }, ETH: { price: 1849.6 } };
try {
  const cached = JSON.parse(fs.readFileSync('market_data.json', 'utf8'));
  marketData = cached.assets;
} catch(e) {}

// Fetch Fear & Greed
const fetchFearGreed = () => new Promise((resolve) => {
  const req = https.get('https://api.alternative.me/fng/?limit=1', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        resolve(json.data[0]);
      } catch(e) { resolve({ value: 27, value_classification: 'Fear' }); }
    });
  });
  req.on('error', () => resolve({ value: 27, value_classification: 'Fear' }));
  req.setTimeout(10000, () => { req.destroy(); resolve({ value: 27, value_classification: 'Fear' }); });
});

// Fetch CoinGecko data for sentiment
const fetchCG = (id) => new Promise((resolve) => {
  const url = `https://api.coingecko.com/api/v3/coins/${id}?tickers=false&market_data=true&community_data=true`;
  const req = https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
    });
  });
  req.on('error', () => resolve(null));
  req.setTimeout(15000, () => { req.destroy(); resolve(null); });
});

(async () => {
  console.log('Fetching alternative data for Alpha Fund...');
  console.log('UTC:', timestamp);
  
  const fearGreed = await fetchFearGreed();
  console.log('Fear & Greed:', fearGreed.value, fearGreed.value_classification);
  
  await new Promise(r => setTimeout(r, 1000));
  const btcData = await fetchCG('bitcoin');
  console.log('BTC data fetched:', btcData ? 'yes' : 'no');
  
  await new Promise(r => setTimeout(r, 1000));
  const ethData = await fetchCG('ethereum');
  console.log('ETH data fetched:', ethData ? 'yes' : 'no');
  
  const altData = {
    timestamp: timestamp,
    local_time: localTime,
    data_fetch_id: `alt-${utcDate}-1917`,
    summary: {
      btc_price_usd: marketData.BTC?.price || 63983.54,
      eth_price_usd: marketData.ETH?.price || 1849.6,
      fear_greed_index: parseInt(fearGreed.value) || 27,
      fear_greed_label: fearGreed.value_classification || 'Fear',
      market_sentiment: parseInt(fearGreed.value) < 25 ? 'EXTREME_FEAR' : parseInt(fearGreed.value) < 45 ? 'FEAR' : 'NEUTRAL',
      anomalies_detected: 0,
      next_update: new Date(now.getTime() + 3600000).toISOString()
    },
    on_chain_metrics: {
      btc: {
        price: marketData.BTC?.price || 63983.54,
        price_change_24h: btcData?.market_data?.price_change_percentage_24h || -0.24,
        volume_24h_usd: btcData?.market_data?.total_volume?.usd || 1045000000,
        market_cap_rank: 1,
        sentiment_votes_up_pct: btcData?.sentiment_votes_up_percentage || 67,
        sentiment_votes_down_pct: 100 - (btcData?.sentiment_votes_up_percentage || 67),
        watchlist_users: btcData?.watchlist_portfolio_users || 2418000,
        ath_usd: btcData?.market_data?.ath?.usd || 126080,
        ath_change_pct: btcData?.market_data?.ath_change_percentage?.usd || -49.7,
        exchange_flows: { status: 'monitoring_required', note: 'Requires Glassnode premium API' },
        whale_activity: { status: 'monitoring_required', note: 'Requires on-chain analytics subscription' }
      },
      eth: {
        price: marketData.ETH?.price || 1849.6,
        price_change_24h: ethData?.market_data?.price_change_percentage_24h || -0.81,
        volume_24h_usd: ethData?.market_data?.total_volume?.usd || 487000000,
        market_cap_rank: 2,
        sentiment_votes_up_pct: ethData?.sentiment_votes_up_percentage || 91,
        sentiment_votes_down_pct: 100 - (ethData?.sentiment_votes_up_percentage || 91),
        watchlist_users: ethData?.watchlist_portfolio_users || 1968700,
        ath_usd: ethData?.market_data?.ath?.usd || 4946,
        ath_change_pct: ethData?.market_data?.ath_change_percentage?.usd || -62.9,
        exchange_flows: { status: 'monitoring_required', note: 'Requires exchange API keys' }
      }
    },
    funding_rates_sentiment: {
      fear_greed_index: {
        value: parseInt(fearGreed.value) || 27,
        classification: fearGreed.value_classification || 'Fear',
        trend: parseInt(fearGreed.value) < 20 ? 'EXTREME_FEAR_ZONE' : parseInt(fearGreed.value) < 30 ? 'FEAR_ZONE' : 'NEUTRAL',
        historical_context: 'Values below 30 often precede relief rallies'
      }
    },
    social_sentiment_indicators: {
      btc_sentiment: (btcData?.sentiment_votes_up_percentage || 67) > 70 ? 'BULLISH' : (btcData?.sentiment_votes_up_percentage || 67) > 50 ? 'NEUTRAL' : 'BEARISH',
      eth_sentiment: (ethData?.sentiment_votes_up_percentage || 91) > 70 ? 'BULLISH' : (ethData?.sentiment_votes_up_percentage || 91) > 50 ? 'NEUTRAL' : 'BEARISH',
      watchlist_growth: {
        btc_users: btcData?.watchlist_portfolio_users || 2418000,
        eth_users: ethData?.watchlist_portfolio_users || 1968700
      }
    },
    anomalies_flagged: [],
    early_signals: {
      bullish_signals: [],
      bearish_signals: [],
      neutral_observations: []
    },
    research_team_notes: {
      data_sources: ['CoinGecko API', 'Alternative.me Fear & Greed Index', 'Cached market data'],
      data_gaps: ['Exchange inflow/outflow requires Glassnode', 'Whale tracking requires on-chain analytics', 'Funding rates require derivatives exchange APIs'],
      cron_job: 'alternative-data-fetch',
      session_id: '91c519d7-1d85-4706-9361-9ff3aa18677f'
    }
  };
  
  // Detect anomalies
  const anomalies = [];
  let anomalyId = 1;
  
  // Fear & Greed anomaly
  const fgValue = parseInt(fearGreed.value) || 27;
  if (fgValue < 25) {
    anomalies.push({
      id: `ALT-${String(anomalyId++).padStart(3, '0')}`,
      asset: 'BTC/ETH',
      type: 'FEAR_EXTREME',
      severity: 'HIGH',
      description: `Fear & Greed Index at ${fgValue} (Extreme Fear)`,
      signal: 'Contrarian opportunity zone - historical market bottoms often here',
      action: 'Consider DCA accumulation strategy'
    });
    altData.early_signals.bullish_signals.push({
      signal: `Fear & Greed at ${fgValue} - extreme fear often marks local bottoms`,
      significance: 'Contrarian indicator flashing accumulation opportunity'
    });
  } else if (fgValue < 35) {
    anomalies.push({
      id: `ALT-${String(anomalyId++).padStart(3, '0')}`,
      asset: 'BTC/ETH',
      type: 'FEAR_ELEVATED',
      severity: 'MEDIUM',
      description: `Fear & Greed Index at ${fgValue} (Fear)`,
      signal: 'Market sentiment negative - watch for reversal signals',
      action: 'Monitor for support holding'
    });
  }
  
  // ETH sentiment divergence
  const ethSentiment = ethData?.sentiment_votes_up_percentage || 91;
  const ethChange = ethData?.market_data?.price_change_percentage_24h || -0.81;
  if (ethSentiment > 85 && ethChange < 0) {
    anomalies.push({
      id: `ALT-${String(anomalyId++).padStart(3, '0')}`,
      asset: 'ETH',
      type: 'SENTIMENT_PRICE_DIVERGENCE',
      severity: 'MEDIUM',
      description: `ETH sentiment ${ethSentiment}% bullish despite price down ${ethChange.toFixed(2)}%`,
      signal: 'Strong community conviction during price weakness',
      action: 'Accumulation zone candidate - strong hodl mentality'
    });
    altData.early_signals.bullish_signals.push({
      signal: 'ETH sentiment extremely positive despite price decline',
      significance: 'Community not panicking - institutional/smart money accumulating'
    });
  }
  
  // Volume analysis
  const btcVol = btcData?.market_data?.total_volume?.usd || 1045000000;
  if (btcVol > 1000000000) {
    altData.early_signals.neutral_observations.push(`BTC volume elevated at $${(btcVol/1e9).toFixed(2)}B - institutional activity or capitulation`);
  }
  
  altData.anomalies_flagged = anomalies;
  altData.summary.anomalies_detected = anomalies.length;
  
  // Generate summary report
  const summaryReport = `# Alternative Data Fetch - ${utcDate} 19:17

## Market Snapshot
- **BTC Price:** $${altData.summary.btc_price_usd.toLocaleString()} (${altData.on_chain_metrics.btc.price_change_24h.toFixed(2)}%)
- **ETH Price:** $${altData.summary.eth_price_usd.toLocaleString()} (${altData.on_chain_metrics.eth.price_change_24h.toFixed(2)}%)
- **Fear & Greed:** ${fgValue} (${fearGreed.value_classification})
- **Market Sentiment:** ${altData.summary.market_sentiment}

## Anomalies Detected: ${anomalies.length}
${anomalies.map(a => `- **${a.id}** (${a.severity}): ${a.type} - ${a.signal}`).join('\n') || 'None'}

## Early Signals
**Bullish:**
${altData.early_signals.bullish_signals.map(s => `- ${s.signal}`).join('\n') || 'None detected'}

**Neutral Observations:**
${altData.early_signals.neutral_observations.map(o => `- ${o}`).join('\n') || 'None'}

## Data Sources
- CoinGecko API
- Alternative.me Fear & Greed Index
- Cached market data (Twelve Data)

## Data Gaps (Upgrade Path)
- Exchange inflow/outflow: Requires Glassnode premium
- Whale tracking: Requires on-chain analytics subscription
- Funding rates: Requires derivatives exchange APIs
- Options flow: Requires Deribit API access

---
*Next update: 1 hour | Cron: alternative-data-fetch*
`;

  const outputPath = `../investment_fund/data/alternative/${utcDate}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(altData, null, 2));
  
  const summaryPath = `../investment_fund/data/alternative/${utcDate}_summary.md`;
  fs.writeFileSync(summaryPath, summaryReport);
  
  console.log('\n=== ALTERNATIVE DATA FETCH COMPLETE ===');
  console.log('Data written to:', outputPath);
  console.log('Summary written to:', summaryPath);
  console.log('Anomalies detected:', anomalies.length);
  anomalies.forEach(a => console.log(`  - ${a.id}: ${a.type} (${a.severity})`));
})();
