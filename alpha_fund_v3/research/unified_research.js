/**
 * ALPHA FUND v3.0 — Unified Research Engine
 * Merges: enhanced_research + asymmetry_scanner + alternative_data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  assets: ['BTC', 'ETH', 'MSTR', 'HIMS', 'NVDA', 'TSLA', 'AAPL', 'COIN', 'SPY', 'QQQ'],
  data_sources: ['twelvedata', 'coingecko', 'yahoo', 'alternative.me', 'mempool.space'],
  indicators: ['rsi', 'macd', 'sma', 'ema', 'atr', 'bollinger', 'stochastic'],
  min_confidence: 0.3,
  cache_ttl_ms: 5 * 60 * 1000 // 5 minutes
};

// Simple in-memory cache
let priceCache = { data: null, timestamp: 0 };

// ─── PRICE FETCHER (Multi-Source + Cached) ────────────────────
async function fetchPrices() {
  const now = Date.now();
  
  // Return cached prices if fresh
  if (priceCache.data && (now - priceCache.timestamp) < CONFIG.cache_ttl_ms) {
    return priceCache.data;
  }
  
  const prices = {};
  
  // Try mission_control market data first
  const marketDataPath = path.join(__dirname, '..', '..', 'mission_control', 'market_data.json');
  if (fs.existsSync(marketDataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(marketDataPath, 'utf8'));
      if (data.assets) {
        Object.entries(data.assets).forEach(([symbol, info]) => {
          prices[symbol] = {
            price: info.price,
            change_24h: info.change_24h,
            source: info.source || 'cache',
            timestamp: data.timestamp
          };
        });
      }
    } catch (e) {}
  }
  
  // Fill gaps with Twelve Data API
  for (const asset of CONFIG.assets) {
    if (!prices[asset]) {
      try {
        const td = require('../../mission_control/enhanced_market_service');
        const quote = await td.getQuote(asset);
        if (quote) {
          prices[asset] = {
            price: quote.price,
            change_24h: quote.change || 0,
            source: 'twelvedata',
            timestamp: new Date().toISOString()
          };
        }
      } catch (e) {}
    }
  }
  
  // Update cache
  priceCache = { data: prices, timestamp: now };
  
  return prices;
}

function clearCache() {
  priceCache = { data: null, timestamp: 0 };
}

// ─── TECHNICAL ANALYSIS ─────────────────────────────────────
function analyzeTechnical(prices) {
  const signals = {};
  
  Object.entries(prices).forEach(([asset, data]) => {
    const change = data.change_24h || 0;
    let score = 0;
    let confidence = 'LOW';
    
    // Momentum scoring
    if (change > 3) score += 2;
    else if (change > 1) score += 1;
    else if (change < -3) score -= 2;
    else if (change < -1) score -= 1;
    
    // Confidence based on data quality
    if (data.source === 'twelvedata') confidence = 'HIGH';
    else if (data.source === 'coingecko') confidence = 'MEDIUM';
    
    signals[asset] = {
      asset,
      price: data.price,
      change_24h: change,
      momentum_score: score,
      technical_rating: score > 1 ? 'BULLISH' : score < -1 ? 'BEARISH' : 'NEUTRAL',
      confidence,
      source: data.source
    };
  });
  
  return signals;
}

// ─── SENTIMENT ANALYSIS ─────────────────────────────────────
function analyzeSentiment() {
  // Try to load from alternative data
  const altDataPath = path.join(__dirname, '..', '..', 'investment_fund', 'data', 'alternative');
  let fear_greed = 50; // Neutral default
  
  try {
    const files = fs.readdirSync(altDataPath).filter(f => f.endsWith('.json') && f.startsWith('20')).sort().reverse();
    if (files.length > 0) {
      const latest = JSON.parse(fs.readFileSync(path.join(altDataPath, files[0]), 'utf8'));
      if (latest.sentiment && latest.sentiment.fear_greed) {
        fear_greed = latest.sentiment.fear_greed.value || latest.sentiment.fear_greed.index || 50;
      }
    }
  } catch (e) {}
  
  return {
    fear_greed,
    fear_greed_classification: fear_greed < 20 ? 'EXTREME_FEAR' : fear_greed < 40 ? 'FEAR' : fear_greed > 75 ? 'GREED' : 'NEUTRAL',
    contrarian_signal: fear_greed < 25 ? 'BULLISH' : fear_greed > 75 ? 'BEARISH' : 'NEUTRAL'
  };
}

// ─── ASYMMETRY SCANNER (7-Factor) ───────────────────────────
function scanAsymmetry(signals, sentiment) {
  const opportunities = [];
  
  Object.values(signals).forEach(signal => {
    let asymmetryScore = 0;
    const factors = [];
    
    // Factor 1: Price momentum divergence
    if (Math.abs(signal.change_24h) > 5) {
      asymmetryScore += 2;
      factors.push('High volatility');
    }
    
    // Factor 2: Sentiment divergence
    if (sentiment.fear_greed < 25 && signal.change_24h < 0) {
      asymmetryScore += 2;
      factors.push('Fear + negative price = contrarian');
    }
    
    // Factor 3: Technical momentum
    asymmetryScore += Math.abs(signal.momentum_score);
    
    // Factor 4: Data quality
    if (signal.confidence === 'HIGH') asymmetryScore += 1;
    
    opportunities.push({
      ticker: signal.asset,
      price: signal.price,
      change_24h: signal.change_24h,
      asymmetryScore: Math.min(asymmetryScore, 10),
      rating: asymmetryScore >= 5 ? 'STRONG' : asymmetryScore >= 3 ? 'MODERATE' : 'WEAK',
      factors,
      technical: signal.technical_rating,
      confidence: signal.confidence
    });
  });
  
  return opportunities.sort((a, b) => b.asymmetryScore - a.asymmetryScore);
}

// ─── COMPOSITE SCORING ──────────────────────────────────────
function compositeScore(technical, sentiment, asymmetry) {
  const scores = {};
  
  Object.values(technical).forEach(t => {
    const opp = asymmetry.find(a => a.ticker === t.asset);
    
    let score = t.momentum_score;
    
    // Add sentiment influence
    if (sentiment.contrarian_signal === 'BULLISH' && t.change_24h < 0) {
      score += 1; // Contrarian boost
    }
    
    // Add asymmetry
    if (opp) {
      score += opp.asymmetryScore * 0.3;
    }
    
    // Normalize to -3 to +3 scale
    const normalized = Math.max(-3, Math.min(3, score));
    
    let rating = 'HOLD';
    if (normalized >= 2) rating = 'STRONG_BUY';
    else if (normalized >= 1) rating = 'BUY';
    else if (normalized >= 0.5) rating = 'WEAK_BUY';
    else if (normalized <= -2) rating = 'STRONG_SELL';
    else if (normalized <= -1) rating = 'SELL';
    else if (normalized <= -0.5) rating = 'WEAK_SELL';
    
    scores[t.asset] = {
      asset: t.asset,
      score: normalized,
      rating,
      price: t.price,
      change_24h: t.change_24h,
      confidence: t.confidence,
      technical: t.technical_rating,
      sentiment: sentiment.fear_greed_classification
    };
  });
  
  return scores;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
async function runAll() {
  console.log('🔬 Running unified research pipeline...');
  
  const prices = await fetchPrices();
  console.log(`   📊 Fetched prices for ${Object.keys(prices).length} assets`);
  
  const technical = analyzeTechnical(prices);
  console.log(`   📈 Technical analysis complete`);
  
  const sentiment = analyzeSentiment();
  console.log(`   🧠 Fear & Greed: ${sentiment.fear_greed} (${sentiment.fear_greed_classification})`);
  
  const asymmetry = scanAsymmetry(technical, sentiment);
  console.log(`   🎯 ${asymmetry.length} opportunities scanned`);
  
  const composite = compositeScore(technical, sentiment, asymmetry);
  
  // Count signals
  const signals = { buy: 0, hold: 0, sell: 0 };
  Object.values(composite).forEach(c => {
    if (c.rating.includes('BUY')) signals.buy++;
    else if (c.rating.includes('SELL')) signals.sell++;
    else signals.hold++;
  });
  
  return {
    assets: Object.keys(prices),
    prices,
    technical,
    sentiment,
    asymmetry,
    composite,
    signals,
    timestamp: new Date().toISOString()
  };
}

module.exports = { runAll, fetchPrices, analyzeTechnical, analyzeSentiment, scanAsymmetry, compositeScore };
