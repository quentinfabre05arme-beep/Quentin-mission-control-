/**
 * ALPHA FUND - ALTERNATIVE DATA FETCHER v1.0
 * Fetches early signals not visible in price data
 * Sources: On-chain, Funding Rates, Social Sentiment, Order Flow
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  DATA_DIR: path.join(__dirname, 'data', 'alternative'),
  CACHE_MINUTES: 15,
  // Free public APIs (no keys required)
  APIS: {
    // CoinGecko for on-chain/social data
    COINGECKO: 'https://api.coingecko.com/api/v3',
    // CryptoQuant-style public endpoints (simulated via available free APIs)
    GLASSNODE: null, // Requires API key
    // Funding rates from various exchanges (via CoinGecko where available)
    FUNDING: 'https://api.coingecko.com/api/v3'
  }
};

// Ensure data directory exists
if (!fs.existsSync(CONFIG.DATA_DIR)) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}

// Utility: HTTP fetch with timeout
async function fetchJSON(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Fetch on-chain metrics from CoinGecko (public)
async function fetchOnChainMetrics() {
  console.log('\n⛓️  FETCHING ON-CHAIN METRICS...');
  
  const metrics = {
    timestamp: new Date().toISOString(),
    btc: {},
    eth: {}
  };
  
  try {
    // Bitcoin on-chain data via CoinGecko
    const btcUrl = `${CONFIG.APIS.COINGECKO}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
    const btcData = await fetchJSON(btcUrl);
    
    const btcMarketCap = btcData.market_data?.market_cap?.usd || 0;
    const btcVolume = btcData.market_data?.total_volume?.usd || 0;
    
    metrics.btc = {
      symbol: 'BTC',
      market_cap_rank: btcData.market_cap_rank,
      market_cap: btcMarketCap,
      total_volume: btcVolume,
      circulating_supply: btcData.market_data?.circulating_supply,
      total_supply: btcData.market_data?.total_supply,
      // Calculate velocity proxy (volume/market_cap)
      velocity_proxy: btcMarketCap > 0 ? btcVolume / btcMarketCap : 0,
      // Community data as proxy for social interest
      social_score: btcData.community_data ? {
        twitter_followers: btcData.community_data.twitter_followers,
        reddit_subscribers: btcData.community_data.reddit_subscribers,
        reddit_active_48h: btcData.community_data.reddit_accounts_active_48h,
        github_stars: btcData.developer_data?.stars,
        github_commits_4w: btcData.developer_data?.commit_count_4_weeks
      } : null,
      // Sentiment proxies
      price_change_24h: btcData.market_data?.price_change_percentage_24h,
      price_change_7d: btcData.market_data?.price_change_percentage_7d,
      price_change_30d: btcData.market_data?.price_change_percentage_30d,
      ath_change: btcData.market_data?.ath_change_percentage?.usd,
      atl_change: btcData.market_data?.atl_change_percentage?.usd
    };
    
    // Add delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
    
    // Ethereum on-chain data
    const ethUrl = `${CONFIG.APIS.COINGECKO}/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
    const ethData = await fetchJSON(ethUrl);
    
    const ethMarketCap = ethData.market_data?.market_cap?.usd || 0;
    const ethVolume = ethData.market_data?.total_volume?.usd || 0;
    
    metrics.eth = {
      symbol: 'ETH',
      market_cap_rank: ethData.market_cap_rank,
      market_cap: ethMarketCap,
      total_volume: ethVolume,
      circulating_supply: ethData.market_data?.circulating_supply,
      total_supply: ethData.market_data?.total_supply,
      // ETH-specific: Calculate dominance and ratio
      btc_dominance_ratio: btcMarketCap > 0 ? ethMarketCap / btcMarketCap : 0,
      velocity_proxy: ethMarketCap > 0 ? ethVolume / ethMarketCap : 0,
      social_score: ethData.community_data ? {
        twitter_followers: ethData.community_data.twitter_followers,
        reddit_subscribers: ethData.community_data.reddit_subscribers,
        reddit_active_48h: ethData.community_data.reddit_accounts_active_48h,
        github_stars: ethData.developer_data?.stars,
        github_commits_4w: ethData.developer_data?.commit_count_4_weeks
      } : null,
      price_change_24h: ethData.market_data?.price_change_percentage_24h,
      price_change_7d: ethData.market_data?.price_change_percentage_7d,
      price_change_30d: ethData.market_data?.price_change_percentage_30d,
      ath_change: ethData.market_data?.ath_change_percentage?.usd,
      atl_change: ethData.market_data?.atl_change_percentage?.usd
    };
    
    // Calculate BTC/ETH correlation proxy
    metrics.correlation_proxy = {
      btc_eth_24h_correlation: metrics.btc.price_change_24h && metrics.eth.price_change_24h ? 
        (metrics.btc.price_change_24h * metrics.eth.price_change_24h > 0 ? 'aligned' : 'divergent') : 'unknown',
      btc_dominance: metrics.btc.market_cap / (metrics.btc.market_cap + metrics.eth.market_cap)
    };
    
    console.log('   ✅ On-chain metrics fetched');
    console.log(`   BTC: Market Cap $${(metrics.btc.market_cap / 1e12).toFixed(2)}T, Velocity ${metrics.btc.velocity_proxy?.toFixed(3)}`);
    console.log(`   ETH: Market Cap $${(metrics.eth.market_cap / 1e9).toFixed(1)}B, ETH/BTC Ratio ${(1/metrics.eth.btc_dominance_ratio).toFixed(4)}`);
    
  } catch (e) {
    console.log(`   ⚠️  On-chain fetch failed: ${e.message}`);
    metrics.error = e.message;
  }
  
  return metrics;
}

// Fetch funding rates (using CoinGecko derivatives data where available)
async function fetchFundingRates() {
  console.log('\n💰 FETCHING FUNDING RATES & DERIVATIVES DATA...');
  
  const funding = {
    timestamp: new Date().toISOString(),
    btc: {},
    eth: {},
    funding_anomaly: false
  };
  
  try {
    // Note: True funding rates require exchange APIs or paid services
    // We use derivatives volume as a proxy for leverage/interest
    const btcDerivativesUrl = `${CONFIG.APIS.COINGECKO}/derivatives/exchanges`;
    const derivativesData = await fetchJSON(btcDerivativesUrl);
    
    // Check if derivativesData is an array
    if (!Array.isArray(derivativesData)) {
      throw new Error('Unexpected derivatives data format');
    }
    
    // Aggregate top exchange open interest
    const topExchanges = ['Binance (Futures)', 'Bybit', 'OKX', 'dYdX', 'HTX (Huobi)'];
    let totalOpenInterest = 0;
    let totalVolume = 0;
    
    derivativesData.forEach(ex => {
      if (topExchanges.some(name => ex.name?.includes(name) || ex.name === name)) {
        totalOpenInterest += ex.open_interest_btc || 0;
        totalVolume += ex.trade_volume_24h_btc || 0;
      }
    });
    
    funding.btc = {
      total_open_interest_btc: totalOpenInterest,
      total_volume_24h_btc: totalVolume,
      // Estimate funding direction based on volume/OI ratio
      leverage_proxy: totalVolume / (totalOpenInterest || 1),
      // High volume relative to OI suggests churn/potential reversal
      churn_indicator: totalVolume > totalOpenInterest * 0.5 ? 'HIGH' : 'NORMAL'
    };
    
    // Calculate funding anomaly indicator
    funding.funding_anomaly = funding.btc.churn_indicator === 'HIGH' && funding.btc.leverage_proxy > 2;
    
    console.log('   ✅ Derivatives data fetched');
    console.log(`   Open Interest: ${totalOpenInterest.toFixed(0)} BTC (~$${(totalOpenInterest * 117000 / 1e9).toFixed(1)}B)`);
    console.log(`   24h Volume: ${totalVolume.toFixed(0)} BTC`);
    console.log(`   Leverage Proxy: ${funding.btc.leverage_proxy?.toFixed(2)}`);
    console.log(`   Churn: ${funding.btc.churn_indicator}${funding.funding_anomaly ? ' ⚠️ ANOMALY DETECTED' : ''}`);
    
  } catch (e) {
    console.log(`   ⚠️  Funding fetch failed: ${e.message}`);
    funding.error = e.message;
  }
  
  return funding;
}

// Fetch social sentiment indicators
async function fetchSocialSentiment() {
  console.log('\n📊 FETCHING SOCIAL SENTIMENT INDICATORS...');
  
  const sentiment = {
    timestamp: new Date().toISOString(),
    btc: {},
    eth: {}
  };
  
  try {
    // CoinGecko trending search as sentiment proxy
    const trendingUrl = `${CONFIG.APIS.COINGECKO}/search/trending`;
    const trendingData = await fetchJSON(trendingUrl);
    
    const btcTrending = trendingData.coins?.find(c => c.item?.symbol === 'BTC');
    const ethTrending = trendingData.coins?.find(c => c.item?.symbol === 'ETH');
    
    sentiment.btc = {
      trending_rank: btcTrending ? `Top ${trendingData.coins.indexOf(btcTrending) + 1}` : 'Not trending',
      trending_score: btcTrending?.item?.score || 0,
      market_cap_rank: btcTrending?.item?.market_cap_rank
    };
    
    sentiment.eth = {
      trending_rank: ethTrending ? `Top ${trendingData.coins.indexOf(ethTrending) + 1}` : 'Not trending',
      trending_score: ethTrending?.item?.score || 0,
      market_cap_rank: ethTrending?.item?.market_cap_rank
    };
    
    // Calculate sentiment divergence
    sentiment.divergence = {
      btc_trending: !!btcTrending,
      eth_trending: !!ethTrending,
      attention_ratio: (btcTrending?.item?.score || 0) / ((ethTrending?.item?.score || 1) + 0.001),
      signal: btcTrending && !ethTrending ? 'BTC_LEADING' : 
              ethTrending && !btcTrending ? 'ETH_LEADING' : 
              'NEUTRAL'
    };
    
    console.log('   ✅ Social sentiment fetched');
    console.log(`   BTC: ${sentiment.btc.trending_rank}`);
    console.log(`   ETH: ${sentiment.eth.trending_rank}`);
    console.log(`   Signal: ${sentiment.divergence.signal}`);
    
  } catch (e) {
    console.log(`   ⚠️  Sentiment fetch failed: ${e.message}`);
    sentiment.error = e.message;
  }
  
  return sentiment;
}

// Fetch order flow proxies (volume patterns, exchange flows)
async function fetchOrderFlowProxies() {
  console.log('\n📈 FETCHING ORDER FLOW PROXIES...');
  
  const orderflow = {
    timestamp: new Date().toISOString(),
    btc: {},
    eth: {},
    unusual_volume: false
  };
  
  try {
    // Get OHLC data to analyze volume patterns
    const btcOhlcUrl = `${CONFIG.APIS.COINGECKO}/coins/bitcoin/ohlc?vs_currency=usd&days=7`;
    const btcOhlc = await fetchJSON(btcOhlcUrl);
    
    // Validate OHLC data format
    if (!Array.isArray(btcOhlc) || btcOhlc.length === 0) {
      throw new Error('Invalid BTC OHLC data format');
    }
    
    await new Promise(r => setTimeout(r, 1500));
    
    const ethOhlcUrl = `${CONFIG.APIS.COINGECKO}/coins/ethereum/ohlc?vs_currency=usd&days=7`;
    const ethOhlc = await fetchJSON(ethOhlcUrl);
    
    if (!Array.isArray(ethOhlc) || ethOhlc.length === 0) {
      throw new Error('Invalid ETH OHLC data format');
    }
    
    // Calculate volume proxies (using price range as volatility indicator)
    const btcRanges = btcOhlc.map(c => ({ day: new Date(c[0]).toISOString().split('T')[0], range: c[2] - c[3], close: c[4] }));
    const ethRanges = ethOhlc.map(c => ({ day: new Date(c[0]).toISOString().split('T')[0], range: c[2] - c[3], close: c[4] }));
    
    // Calculate average and recent volatility
    const btcAvgVol = btcRanges.reduce((s, c) => s + c.range, 0) / btcRanges.length;
    const ethAvgVol = ethRanges.reduce((s, c) => s + c.range, 0) / ethRanges.length;
    
    const btcRecentVol = btcRanges[btcRanges.length - 1].range;
    const ethRecentVol = ethRanges[ethRanges.length - 1].range;
    
    orderflow.btc = {
      avg_daily_volatility: btcAvgVol,
      recent_volatility: btcRecentVol,
      volatility_spike: btcRecentVol > btcAvgVol * 1.5 ? 'SPIKE' : 'NORMAL',
      volatility_ratio: btcRecentVol / btcAvgVol
    };
    
    orderflow.eth = {
      avg_daily_volatility: ethAvgVol,
      recent_volatility: ethRecentVol,
      volatility_spike: ethRecentVol > ethAvgVol * 1.5 ? 'SPIKE' : 'NORMAL',
      volatility_ratio: ethRecentVol / ethAvgVol
    };
    
    // Detect unusual volume/activity
    orderflow.unusual_volume = orderflow.btc.volatility_spike === 'SPIKE' || orderflow.eth.volatility_spike === 'SPIKE';
    
    // Volatility regime
    orderflow.volatility_regime = {
      btc: orderflow.btc.volatility_ratio > 2 ? 'EXTREME' : orderflow.btc.volatility_ratio > 1.5 ? 'HIGH' : 'NORMAL',
      eth: orderflow.eth.volatility_ratio > 2 ? 'EXTREME' : orderflow.eth.volatility_ratio > 1.5 ? 'HIGH' : 'NORMAL'
    };
    
    console.log('   ✅ Order flow proxies fetched');
    console.log(`   BTC Vol Spike: ${orderflow.btc.volatility_ratio?.toFixed(2)}x avg ${orderflow.btc.volatility_spike === 'SPIKE' ? '⚠️' : ''}`);
    console.log(`   ETH Vol Spike: ${orderflow.eth.volatility_ratio?.toFixed(2)}x avg ${orderflow.eth.volatility_spike === 'SPIKE' ? '⚠️' : ''}`);
    
  } catch (e) {
    console.log(`   ⚠️  Order flow fetch failed: ${e.message}`);
    orderflow.error = e.message;
  }
  
  return orderflow;
}

// Generate anomaly flags
function detectAnomalies(data) {
  console.log('\n🚨 ANOMALY DETECTION...');
  
  const anomalies = [];
  const timestamp = new Date().toISOString();
  
  // On-chain anomalies
  if (data.onchain?.btc?.velocity_proxy > 0.15) {
    anomalies.push({
      type: 'ONCHAIN',
      severity: 'MEDIUM',
      asset: 'BTC',
      signal: 'HIGH_VELOCITY',
      description: 'BTC velocity proxy elevated - potential distribution',
      value: data.onchain.btc.velocity_proxy,
      timestamp
    });
  }
  
  if (data.onchain?.btc?.ath_change && data.onchain.btc.ath_change < -30) {
    anomalies.push({
      type: 'ONCHAIN',
      severity: 'HIGH',
      asset: 'BTC',
      signal: 'FAR_FROM_ATH',
      description: 'BTC significantly below ATH - potential accumulation zone',
      value: data.onchain.btc.ath_change,
      timestamp
    });
  }
  
  // Funding anomalies
  if (data.funding?.funding_anomaly) {
    anomalies.push({
      type: 'FUNDING',
      severity: 'HIGH',
      asset: 'BTC',
      signal: 'LEVERAGE_ANOMALY',
      description: 'High leverage detected in derivatives - potential squeeze risk',
      value: data.funding.btc.leverage_proxy,
      timestamp
    });
  }
  
  // Sentiment anomalies
  if (data.sentiment?.divergence?.signal === 'BTC_LEADING') {
    anomalies.push({
      type: 'SENTIMENT',
      severity: 'LOW',
      asset: 'BTC',
      signal: 'ATTENTION_DIVERGENCE',
      description: 'BTC trending while ETH is not - attention rotation signal',
      timestamp
    });
  }
  
  // Volatility anomalies
  if (data.orderflow?.unusual_volume) {
    const asset = data.orderflow.btc.volatility_spike === 'SPIKE' ? 'BTC' : 'ETH';
    anomalies.push({
      type: 'VOLATILITY',
      severity: 'MEDIUM',
      asset,
      signal: 'VOLATILITY_SPIKE',
      description: `${asset} showing unusual volatility - potential breakout or reversal`,
      timestamp
    });
  }
  
  // BTC/ETH divergence
  if (data.onchain?.btc?.price_change_24h && data.onchain?.eth?.price_change_24h) {
    const divergence = Math.abs(data.onchain.btc.price_change_24h - data.onchain.eth.price_change_24h);
    if (divergence > 5) {
      anomalies.push({
        type: 'CORRELATION',
        severity: 'MEDIUM',
        asset: 'BTC/ETH',
        signal: 'DIVERGENCE',
        description: `BTC/ETH 24h divergence ${divergence.toFixed(1)}% - correlation breakdown`,
        value: divergence,
        timestamp
      });
    }
  }
  
  console.log(`   Found ${anomalies.length} anomalies`);
  anomalies.forEach(a => {
    const emoji = a.severity === 'HIGH' ? '🔴' : a.severity === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`   ${emoji} [${a.type}] ${a.signal}: ${a.description}`);
  });
  
  return anomalies;
}

// Generate summary insights
function generateInsights(data) {
  console.log('\n💡 GENERATING INSIGHTS...');
  
  const insights = [];
  
  // Market structure insights
  if (data.onchain?.btc?.market_cap && data.onchain?.eth?.market_cap) {
    const btcDominance = data.onchain.btc.market_cap / (data.onchain.btc.market_cap + data.onchain.eth.market_cap);
    insights.push({
      category: 'MARKET_STRUCTURE',
      title: 'BTC Dominance',
      value: `${(btcDominance * 100).toFixed(1)}%`,
      signal: btcDominance > 0.55 ? 'BTC_LEADING' : btcDominance < 0.45 ? 'ETH_LEADING' : 'BALANCED',
      interpretation: btcDominance > 0.55 ? 'Flight to quality - risk-off in crypto' : 'Risk-on environment - alt strength'
    });
  }
  
  // Social momentum
  if (data.sentiment?.divergence) {
    insights.push({
      category: 'SOCIAL',
      title: 'Attention Flow',
      signal: data.sentiment.divergence.signal,
      interpretation: data.sentiment.divergence.signal === 'BTC_LEADING' ? 
        'Retail attention shifting to BTC - often precedes BTC strength' :
        data.sentiment.divergence.signal === 'ETH_LEADING' ?
        'ETH capturing mindshare - potential for ETH outperformance' :
        'Balanced attention - no clear rotation signal'
    });
  }
  
  // Derivatives/Leverage
  if (data.funding?.btc?.leverage_proxy) {
    insights.push({
      category: 'DERIVATIVES',
      title: 'Leverage Environment',
      value: data.funding.btc.leverage_proxy.toFixed(2),
      signal: data.funding.btc.leverage_proxy > 2 ? 'OVERLEVERAGED' : 'NORMAL',
      interpretation: data.funding.btc.leverage_proxy > 2 ? 
        'High leverage - vulnerable to liquidations' :
        'Healthy leverage levels'
    });
  }
  
  // Volatility regime
  if (data.orderflow?.volatility_regime) {
    const regime = data.orderflow.volatility_regime.btc;
    insights.push({
      category: 'VOLATILITY',
      title: 'BTC Vol Regime',
      signal: regime,
      interpretation: regime === 'EXTREME' ? 'Extreme volatility - expect large moves' :
        regime === 'HIGH' ? 'Elevated volatility - increased option premiums' :
        'Normal volatility - stable conditions'
    });
  }
  
  insights.forEach(i => {
    console.log(`   • [${i.category}] ${i.title}: ${i.signal}${i.value ? ` (${i.value})` : ''}`);
  });
  
  return insights;
}

// Main execution
async function fetchAlternativeData() {
  const startTime = Date.now();
  const dateStr = new Date().toISOString().split('T')[0];
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ALPHA FUND - ALTERNATIVE DATA FETCH v1.0');
  console.log(`  Date: ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Fetch all data sources
    const onchain = await fetchOnChainMetrics();
    await new Promise(r => setTimeout(r, 1000));
    
    const funding = await fetchFundingRates();
    await new Promise(r => setTimeout(r, 1000));
    
    const sentiment = await fetchSocialSentiment();
    await new Promise(r => setTimeout(r, 1000));
    
    const orderflow = await fetchOrderFlowProxies();
    
    // Compile full dataset
    const fullData = {
      timestamp: new Date().toISOString(),
      source: 'Alpha Fund Alternative Data Fetcher v1.0',
      onchain,
      funding,
      sentiment,
      orderflow
    };
    
    // Detect anomalies
    fullData.anomalies = detectAnomalies(fullData);
    
    // Generate insights
    fullData.insights = generateInsights(fullData);
    
    // Calculate composite signals
    fullData.composite_signals = {
      risk_on_off: fullData.insights.find(i => i.category === 'MARKET_STRUCTURE')?.signal || 'UNKNOWN',
      leverage_risk: fullData.insights.find(i => i.category === 'DERIVATIVES')?.signal || 'UNKNOWN',
      volatility_regime: fullData.insights.find(i => i.category === 'VOLATILITY')?.signal || 'NORMAL',
      attention_flow: fullData.insights.find(i => i.category === 'SOCIAL')?.signal || 'NEUTRAL',
      anomaly_count: fullData.anomalies.length,
      high_severity_anomalies: fullData.anomalies.filter(a => a.severity === 'HIGH').length
    };
    
    // Save to file
    const outputPath = path.join(CONFIG.DATA_DIR, `${dateStr}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2));
    
    const elapsed = Date.now() - startTime;
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  FETCH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Elapsed: ${elapsed}ms`);
    console.log(`💾 Saved: ${outputPath}`);
    console.log(`🚨 Anomalies: ${fullData.anomalies.length} detected (${fullData.composite_signals.high_severity_anomalies} high severity)`);
    console.log('\n📊 COMPOSITE SIGNALS:');
    console.log(`   Risk Mode: ${fullData.composite_signals.risk_on_off}`);
    console.log(`   Leverage: ${fullData.composite_signals.leverage_risk}`);
    console.log(`   Volatility: ${fullData.composite_signals.volatility_regime}`);
    console.log(`   Attention: ${fullData.composite_signals.attention_flow}`);
    
    // Flag for research team if high severity anomalies
    if (fullData.composite_signals.high_severity_anomalies > 0) {
      console.log('\n🔴 HIGH PRIORITY ALERT - Research team notification required');
      console.log('   Anomalies requiring immediate attention:');
      fullData.anomalies.filter(a => a.severity === 'HIGH').forEach(a => {
        console.log(`   • ${a.asset}: ${a.description}`);
      });
    }
    
    return fullData;
    
  } catch (e) {
    console.error('\n❌ Fetch failed:', e.message);
    throw e;
  }
}

// CLI entry
async function main() {
  try {
    await fetchAlternativeData();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

module.exports = { fetchAlternativeData, detectAnomalies, generateInsights };

if (require.main === module) main();
