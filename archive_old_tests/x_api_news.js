// x_api_news.js - X API v2 Free Tier News Reader
// Uses only free endpoints: search, user lookup

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  newsFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_news.json',
  logFile: 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\x_news.log'
};

async function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}`;
  console.log(entry);
  await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true }).catch(() => {});
  await fs.appendFile(CONFIG.logFile, entry + '\n').catch(() => {});
}

async function main() {
  await log('=== X News Fetcher Starting ===');
  
  if (!CONFIG.appKey || !CONFIG.appSecret) {
    await log('❌ Missing API credentials');
    return;
  }
  
  const client = new TwitterApi(CONFIG);
  
  try {
    // Verify auth
    const user = await client.v2.me();
    await log(`✅ Authenticated as @${user.data.username}`);
    
    // Search crypto news (FREE endpoint)
    await log('Searching Bitcoin/Crypto news...');
    const crypto = await client.v2.search(
      'BTC OR ETH OR Bitcoin OR Ethereum OR MSTR -is:retweet -is:reply lang:en',
      {
        max_results: 20,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['username', 'name'],
        expansions: ['author_id']
      }
    );
    await log(`Got ${crypto.data?.length || 0} crypto tweets`);
    
    // Search healthcare news (FREE endpoint)
    await log('Searching Healthcare/GLP-1 news...');
    const healthcare = await client.v2.search(
      'GLP-1 OR Hims OR healthcare OR longevity OR telehealth -is:retweet -is:reply lang:en',
      {
        max_results: 20,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['username', 'name'],
        expansions: ['author_id']
      }
    );
    await log(`Got ${healthcare.data?.length || 0} healthcare tweets`);
    
    // Search tech/finance
    await log('Searching Tech/Finance...');
    const tech = await client.v2.search(
      'AI OR "artificial intelligence" OR crypto OR DeFi -is:retweet -is:reply lang:en',
      {
        max_results: 15,
        'tweet.fields': ['created_at', 'public_metrics']
      }
    );
    await log(`Got ${tech.data?.length || 0} tech tweets`);
    
    // Build user lookup map
    const users = new Map();
    if (crypto.includes?.users) {
      for (const u of crypto.includes.users) users.set(u.id, u);
    }
    if (healthcare.includes?.users) {
      for (const u of healthcare.includes.users) users.set(u.id, u);
    }
    
    // Enrich tweets with author info
    const enrichTweets = (tweets) => {
      return (tweets || []).map(t => ({
        ...t,
        author: users.get(t.author_id) || { username: 'unknown' }
      }));
    };
    
    // Save news
    const newsData = {
      fetchedAt: new Date().toISOString(),
      summary: {
        crypto: crypto.data?.length || 0,
        healthcare: healthcare.data?.length || 0,
        tech: tech.data?.length || 0
      },
      crypto: enrichTweets(crypto.data),
      healthcare: enrichTweets(healthcare.data),
      tech: tech.data || []
    };
    
    await fs.writeFile(CONFIG.newsFile, JSON.stringify(newsData, null, 2));
    await log(`✅ News saved: ${CONFIG.newsFile}`);
    await log(`   Total: ${newsData.summary.crypto + newsData.summary.healthcare + newsData.summary.tech} tweets`);
    
  } catch (err) {
    if (err.code === 401) {
      await log('❌ Authentication failed — check tokens');
    } else if (err.code === 429) {
      await log('❌ Rate limited — wait 15 minutes');
    } else {
      await log(`❌ Error: ${err.message}`);
    }
  }
  
  await log('=== X News Fetcher Complete ===');
}

if (require.main === module) {
  main().catch(async err => {
    await log(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main };
