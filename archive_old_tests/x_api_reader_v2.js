// x_api_reader_v2.js - X API v2 with OAuth 2.0 User Context
// Full read access: timeline, mentions, search

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
  newsFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_news.json',
  logFile: 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\x_reader.log'
};

async function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}`;
  console.log(entry);
  await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true }).catch(() => {});
  await fs.appendFile(CONFIG.logFile, entry + '\n').catch(() => {});
}

async function main() {
  await log('=== X API Reader v2 Starting ===');
  
  // Validate credentials
  if (!CONFIG.appKey || !CONFIG.appSecret || !CONFIG.accessToken || !CONFIG.accessSecret) {
    await log('❌ Missing OAuth 2.0 credentials');
    await log('Need: API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET');
    return;
  }
  
  const client = new TwitterApi(CONFIG);
  
  try {
    // Get current user
    const user = await client.v2.me();
    await log(`Authenticated as: @${user.data.username}`);
    
    // Get home timeline
    await log('Fetching home timeline...');
    const timeline = await client.v2.homeTimeline({
      max_results: 20,
      'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'context_annotations'],
      'user.fields': ['username', 'profile_image_url'],
      expansions: ['author_id']
    });
    await log(`Got ${timeline.data?.length || 0} tweets`);
    
    // Get mentions
    await log('Fetching mentions...');
    const mentions = await client.v2.userMentions(user.data.id, {
      max_results: 10
    });
    await log(`Got ${mentions.data?.length || 0} mentions`);
    
    // Search for news
    await log('Searching crypto news...');
    const crypto = await client.v2.search('BTC OR ETH OR Bitcoin OR Ethereum -is:retweet', {
      max_results: 20,
      'tweet.fields': ['created_at', 'public_metrics']
    });
    await log(`Got ${crypto.data?.length || 0} crypto tweets`);
    
    await log('Searching healthcare news...');
    const healthcare = await client.v2.search('GLP-1 OR Hims OR healthcare -is:retweet', {
      max_results: 20,
      'tweet.fields': ['created_at', 'public_metrics']
    });
    await log(`Got ${healthcare.data?.length || 0} healthcare tweets`);
    
    // Save news
    const newsData = {
      fetchedAt: new Date().toISOString(),
      user: user.data,
      timeline: timeline.data || [],
      mentions: mentions.data || [],
      search: {
        crypto: crypto.data || [],
        healthcare: healthcare.data || []
      }
    };
    
    await fs.writeFile(CONFIG.newsFile, JSON.stringify(newsData, null, 2));
    await log('✅ News saved to x_news.json');
    
  } catch (err) {
    if (err.code === 401) {
      await log('❌ Authentication failed — tokens may be invalid');
    } else if (err.code === 403) {
      await log('❌ Forbidden — app may need Elevated access');
    } else {
      await log(`❌ Error: ${err.message}`);
    }
  }
  
  await log('=== X API Reader v2 Complete ===');
}

if (require.main === module) {
  main().catch(async err => {
    await log(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
