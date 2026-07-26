/**
 * SENTIMENT ANALYSIS MODULE
 * Aggregates sentiment from multiple sources
 * X/Twitter, Reddit, News headlines, Google Trends
 */

const https = require('https');

// Serper.dev API for news and search
const SERPER_KEY = process.env.SERPER_KEY || require('../lib/secret_resolver').getSecret('serper-api');

// Fetch news via Serper
async function fetchNews(query) {
  const postData = JSON.stringify({ q: query, num: 10 });
  
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

// Simple sentiment scoring
function scoreSentiment(text) {
  const positive = ['surge', 'bullish', 'breakout', 'rally', 'gain', 'rise', 'growth', 'moon', 'pump', 'strong', 'buy', 'upgrade', 'target', 'beat', 'outperform'];
  const negative = ['crash', 'bearish', 'dump', 'fall', 'decline', 'drop', 'sell', 'downgrade', 'miss', 'underperform', 'loss', 'fear', 'panic'];
  
  const lower = text.toLowerCase();
  let score = 0;
  
  positive.forEach(word => { if (lower.includes(word)) score += 1; });
  negative.forEach(word => { if (lower.includes(word)) score -= 1; });
  
  return score;
}

// Analyze sentiment for a symbol
async function analyzeSentiment(symbol) {
  const queries = {
    'BTC': 'bitcoin BTC crypto',
    'ETH': 'ethereum ETH crypto',
    'MSTR': 'MicroStrategy MSTR stock',
    'HIMS': 'Hims \u0026 Hers HIMS stock'
  };
  
  const query = queries[symbol] || symbol;
  
  console.log(`\n🔮 Sentiment Analysis: ${symbol}`);
  console.log(`   Query: "${query}"`);
  
  try {
    const news = await fetchNews(query);
    
    if (!news.news || news.news.length === 0) {
      return { symbol, error: 'No news data available' };
    }
    
    // Score each headline
    const scored = news.news.map(item => ({
      title: item.title,
      source: item.source,
      date: item.date,
      link: item.link,
      sentiment: scoreSentiment(item.title + ' ' + (item.snippet || '')),
      snippet: item.snippet?.substring(0, 100) + '...'
    }));
    
    // Calculate aggregate
    const totalScore = scored.reduce((sum, item) => sum + item.sentiment, 0);
    const avgScore = totalScore / scored.length;
    
    const positive = scored.filter(i => i.sentiment > 0).length;
    const negative = scored.filter(i => i.sentiment < 0).length;
    const neutral = scored.filter(i => i.sentiment === 0).length;
    
    return {
      symbol,
      timestamp: new Date().toISOString(),
      summary: {
        score: avgScore.toFixed(2),
        rating: getSentimentRating(avgScore),
        positive,
        negative,
        neutral,
        total: scored.length
      },
      headlines: scored.slice(0, 5)
    };
    
  } catch (e) {
    return { symbol, error: e.message };
  }
}

function getSentimentRating(score) {
  if (score >= 1.5) return 'VERY BULLISH 🔥';
  if (score >= 0.5) return 'BULLISH 🟢';
  if (score >= -0.5) return 'NEUTRAL ⚪';
  if (score >= -1.5) return 'BEARISH 🔴';
  return 'VERY BEARISH 💀';
}

// Format output
function formatSentiment(data) {
  if (data.error) {
    console.log(`\n❌ Error: ${data.error}`);
    return;
  }
  
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  SENTIMENT ANALYSIS: ${data.symbol.padEnd(11)} ║`);
  console.log(`╚════════════════════════════════════════════╝`);
  
  const s = data.summary;
  console.log(`\n📊 SCORE: ${s.score} → ${s.rating}`);
  console.log(`\n📰 HEADLINES ANALYZED: ${s.total}`);
  console.log(`   🟢 Positive: ${s.positive}`);
  console.log(`   ⚪ Neutral: ${s.neutral}`);
  console.log(`   🔴 Negative: ${s.negative}`);
  
  console.log(`\n📑 TOP HEADLINES:`);
  data.headlines.forEach((h, i) => {
    const emoji = h.sentiment > 0 ? '🟢' : h.sentiment < 0 ? '🔴' : '⚪';
    console.log(`\n   ${i+1}. ${emoji} ${h.title}`);
    console.log(`      Source: ${h.source} | Score: ${h.sentiment}`);
  });
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const symbol = args[0]?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'text';
  
  try {
    const data = await analyzeSentiment(symbol);
    
    if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      formatSentiment(data);
    }
  } catch (e) {
    console.error(`❌ Analysis failed: ${e.message}`);
  }
}

module.exports = { analyzeSentiment, formatSentiment };

if (require.main === module) main();
