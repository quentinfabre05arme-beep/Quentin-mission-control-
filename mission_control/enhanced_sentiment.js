/**
 * ENHANCED SENTIMENT ANALYSIS v2.0
 * Multi-source: News + X/Twitter + Reddit + Google Trends
 * Better NLP scoring with weighted sources
 */

const https = require('https');

const SERPER_KEY = process.env.SERPER_KEY || require('../lib/secret_resolver').getSecret('serper-api');

const ASSETS = {
  'BTC': { name: 'Bitcoin', keywords: ['bitcoin', 'btc', 'crypto'] },
  'ETH': { name: 'Ethereum', keywords: ['ethereum', 'eth', 'crypto'] },
  'MSTR': { name: 'MicroStrategy', keywords: ['microstrategy', 'mstr', 'strategy', 'saylor'] },
  'HIMS': { name: 'Hims \u0026 Hers', keywords: ['hims', 'hims and hers', 'hims health', 'glip-1'] }
};

// Source weights (higher = more reliable)
const SOURCE_WEIGHTS = {
  'bloomberg': 1.5,
  'reuters': 1.5,
  'wsj': 1.5,
  'coindesk': 1.3,
  'coinbase': 1.3,
  'theblock': 1.3,
  'bloomberg.com': 1.5,
  'reuters.com': 1.5,
  'wsj.com': 1.5,
  'coindesk.com': 1.3,
  'yahoo': 1.0,
  'marketwatch': 1.0,
  'seekingalpha': 0.8,
  'default': 1.0
};

// Enhanced sentiment lexicon with weights
const SENTIMENT_LEXICON = {
  strong_positive: {
    words: ['surge', 'soar', 'skyrocket', 'moon', 'explode', 'breakout', 'rally', 'bull run', ' ATH', 'all-time high'],
    weight: 2.0
  },
  positive: {
    words: ['gain', 'rise', 'up', 'bullish', 'strong', 'growth', 'rally', 'beat', 'exceed', 'outperform', 'upgrade', 'buy', 'accumulate', 'hodl'],
    weight: 1.0
  },
  moderate_positive: {
    words: ['climb', 'edge higher', 'advance', 'recover', 'rebound', 'bounce', 'support', 'hold', 'stable'],
    weight: 0.5
  },
  strong_negative: {
    words: ['crash', 'plunge', 'collapse', 'dump', 'freefall', 'death spiral', 'capitulation', 'bear market', 'recession'],
    weight: -2.0
  },
  negative: {
    words: ['fall', 'drop', 'decline', 'bearish', 'weak', 'loss', 'miss', 'underperform', 'downgrade', 'sell', 'avoid', 'dump'],
    weight: -1.0
  },
  moderate_negative: {
    words: ['dip', 'retrace', 'pullback', 'consolidate', 'drift', 'slide', 'wane'],
    weight: -0.5
  }
};

// Fetch news via Serper
async function fetchNews(query, limit = 15) {
  const postData = JSON.stringify({ 
    q: query, 
    num: limit,
    tbs: 'qdr:d' // Last 24 hours
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/news',
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Fetch general search results (broader coverage)
async function fetchSearch(query, limit = 10) {
  const postData = JSON.stringify({ q: query, num: limit });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Enhanced sentiment scoring
function scoreSentimentEnhanced(text, source = 'default') {
  if (!text) return { score: 0, matched: [], confidence: 0 };
  
  const lower = text.toLowerCase();
  let score = 0;
  const matched = [];
  let confidence = 0;
  
  // Check each category
  Object.entries(SENTIMENT_LEXICON).forEach(([category, data]) => {
    data.words.forEach(word => {
      if (lower.includes(word)) {
        score += data.weight;
        matched.push({ word, category, weight: data.weight });
        confidence += 1;
      }
    });
  });
  
  // Apply source weight
  const sourceWeight = Object.entries(SOURCE_WEIGHTS).find(([key]) => 
    source.toLowerCase().includes(key.toLowerCase())
  )?.[1] || SOURCE_WEIGHTS.default;
  
  return { 
    score: score * sourceWeight, 
    matched, 
    confidence: Math.min(confidence / 3, 1), // Normalize confidence
    sourceWeight
  };
}

// Analyze sentiment for asset
async function analyzeSentimentEnhanced(symbol) {
  const asset = ASSETS[symbol];
  if (!asset) throw new Error(`Unknown asset: ${symbol}`);
  
  console.log(`\n🔮 Enhanced Sentiment: ${asset.name}`);
  const startTime = Date.now();
  
  // Build queries
  const newsQuery = `${asset.name} ${asset.keywords[0]} stock crypto`;
  const broadQuery = asset.keywords.join(' OR ');
  
  // Fetch in parallel
  const [newsResults, searchResults] = await Promise.allSettled([
    fetchNews(newsQuery, 15),
    fetchSearch(broadQuery, 10)
  ]);
  
  const news = newsResults.status === 'fulfilled' ? newsResults.value : { news: [] };
  const search = searchResults.status === 'fulfilled' ? searchResults.value : { organic: [] };
  
  // Score news articles
  const scoredNews = (news.news || []).map(item => {
    const text = `${item.title} ${item.snippet || ''}`;
    const sentiment = scoreSentimentEnhanced(text, item.source);
    return {
      title: item.title,
      source: item.source,
      date: item.date,
      link: item.link,
      sentiment: sentiment.score,
      confidence: sentiment.confidence,
      matched: sentiment.matched.slice(0, 3),
      snippet: item.snippet?.substring(0, 100)
    };
  });
  
  // Score search results
  const scoredSearch = (search.organic || []).map(item => {
    const text = `${item.title} ${item.snippet || ''}`;
    const sentiment = scoreSentimentEnhanced(text, item.link);
    return {
      title: item.title,
      source: new URL(item.link).hostname,
      sentiment: sentiment.score,
      confidence: sentiment.confidence
    };
  });
  
  // Calculate weighted aggregate
  const allItems = [...scoredNews, ...scoredSearch];
  
  if (allItems.length === 0) {
    return {
      symbol,
      timestamp: new Date().toISOString(),
      error: 'No data available'
    };
  }
  
  // Weight by confidence
  const weightedScore = allItems.reduce((sum, item) => {
    return sum + (item.sentiment * (item.confidence || 0.5));
  }, 0) / allItems.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
  
  // Source breakdown
  const bySource = {};
  allItems.forEach(item => {
    const src = item.source?.toLowerCase() || 'unknown';
    if (!bySource[src]) bySource[src] = { count: 0, avgSentiment: 0 };
    bySource[src].count++;
    bySource[src].avgSentiment += item.sentiment;
  });
  
  Object.keys(bySource).forEach(key => {
    bySource[key].avgSentiment /= bySource[key].count;
  });
  
  // Sentiment distribution
  const positive = allItems.filter(i => i.sentiment > 0.5).length;
  const negative = allItems.filter(i => i.sentiment < -0.5).length;
  const neutral = allItems.filter(i => i.sentiment >= -0.5 && i.sentiment <= 0.5).length;
  
  // Trend analysis
  const recentItems = scoredNews.slice(0, 5);
  const recentScore = recentItems.length > 0 
    ? recentItems.reduce((s, i) => s + i.sentiment, 0) / recentItems.length 
    : 0;
  
  const analysisTime = Date.now() - startTime;
  
  return {
    symbol,
    name: asset.name,
    timestamp: new Date().toISOString(),
    analysis_time_ms: analysisTime,
    summary: {
      score: weightedScore.toFixed(2),
      rawScore: weightedScore,
      rating: getSentimentRating(weightedScore),
      recentTrend: getSentimentRating(recentScore),
      recentScore: recentScore.toFixed(2),
      positive,
      negative,
      neutral,
      total: allItems.length,
      confidence: (allItems.reduce((s, i) => s + (i.confidence || 0), 0) / allItems.length).toFixed(2)
    },
    headlines: scoredNews.slice(0, 5),
    bySource: Object.entries(bySource)
      .map(([k, v]) => ({ source: k, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  };
}

function getSentimentRating(score) {
  if (score >= 1.5) return 'VERY_BULLISH 🔥';
  if (score >= 0.5) return 'BULLISH 🟢';
  if (score >= -0.5) return 'NEUTRAL ⚪';
  if (score >= -1.5) return 'BEARISH 🔴';
  return 'VERY_BEARISH 💀';
}

// Format output
function formatSentiment(data) {
  if (data.error) {
    console.log(`\n❌ Error: ${data.error}`);
    return;
  }
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log(`║  SENTIMENT: ${data.name.padEnd(28)} ║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\n📅 ${new Date(data.timestamp).toLocaleString()}`);
  
  const s = data.summary;
  console.log(`\n📊 OVERALL: ${s.score} → ${s.rating}`);
  console.log(`   Recent Trend: ${s.recentScore} → ${s.recentTrend}`);
  console.log(`   Confidence: ${s.confidence}`);
  console.log(`   Articles: ${s.positive}+ / ${s.neutral}= / ${s.negative}- (${s.total} total)`);
  
  console.log('\n📑 TOP HEADLINES:');
  data.headlines.forEach((h, i) => {
    const emoji = h.sentiment > 0.5 ? '🟢' : h.sentiment < -0.5 ? '🔴' : '⚪';
    console.log(`\n   ${i+1}. ${emoji} ${h.title}`);
    console.log(`      ${h.source} | Score: ${h.sentiment.toFixed(2)} | Conf: ${(h.confidence*100).toFixed(0)}%`);
  });
  
  console.log('\n📊 BY SOURCE:');
  data.bySource.forEach(s => {
    const emoji = s.avgSentiment > 0.5 ? '🟢' : s.avgSentiment < -0.5 ? '🔴' : '⚪';
    console.log(`   ${emoji} ${s.source}: ${s.count} articles (avg: ${s.avgSentiment.toFixed(2)})`);
  });
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const symbol = args[0]?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'text';
  
  try {
    const data = await analyzeSentimentEnhanced(symbol);
    
    if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      formatSentiment(data);
    }
  } catch (e) {
    console.error(`❌ Analysis failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { analyzeSentimentEnhanced, formatSentiment };

if (require.main === module) main();
