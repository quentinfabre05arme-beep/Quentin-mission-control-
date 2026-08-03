// x_api_reader.js - X API v2 for read operations (Free tier)
// Gets news, trends, mentions, timeline

const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  bearerToken: process.env.X_BEARER_TOKEN,
  cacheDir: 'C:\\Users\\quent\\.openclaw\\workspace\\cache',
  newsFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_news.json',
  maxCacheAge: 30 * 60 * 1000  // 30 minutes
};

async function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function xApiRequest(endpoint, params = {}) {
  const url = new URL(`https://api.twitter.com/2${endpoint}`);
  Object.entries(params).forEach(([key, val]) => url.searchParams.set(key, val));
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CONFIG.bearerToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }
  
  return await response.json();
}

async function getHomeTimeline() {
  await log('Fetching home timeline...');
  return await xApiRequest('/users/me/timelines/reverse_chronological', {
    'tweet.fields': 'created_at,author_id,public_metrics',
    'user.fields': 'username,profile_image_url',
    'expansions': 'author_id',
    'max_results': 20
  });
}

async function getMentions() {
  await log('Fetching mentions...');
  return await xApiRequest('/users/me/mentions', {
    'tweet.fields': 'created_at,author_id,public_metrics',
    'max_results': 10
  });
}

async function searchTweets(query) {
  await log(`Searching: ${query}`);
  return await xApiRequest('/tweets/search/recent', {
    query: query,
    'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
    'max_results': 20
  });
}

async function getTrends() {
  // Note: Trends requires Elevated access on Free tier
  await log('Note: Trends requires Elevated access');
  return { note: 'Trends API requires Elevated access' };
}

async function getUserByUsername(username) {
  return await xApiRequest(`/users/by/username/${username}`, {
    'user.fields': 'public_metrics,created_at,description'
  });
}

async function saveNews(data) {
  const newsData = {
    fetchedAt: new Date().toISOString(),
    timeline: data.timeline,
    mentions: data.mentions,
    search: data.search
  };
  
  await fs.mkdir(path.dirname(CONFIG.newsFile), { recursive: true });
  await fs.writeFile(CONFIG.newsFile, JSON.stringify(newsData, null, 2));
  await log('News saved to x_news.json');
}

async function main() {
  await log('=== X API Reader Starting ===');
  
  if (!CONFIG.bearerToken) {
    await log('❌ Bearer token not configured');
    return;
  }
  
  try {
    // Get home timeline
    const timeline = await getHomeTimeline();
    await log(`Got ${timeline.data?.length || 0} tweets from timeline`);
    
    // Get mentions
    const mentions = await getMentions();
    await log(`Got ${mentions.data?.length || 0} mentions`);
    
    // Search for crypto/healthcare news
    const cryptoNews = await searchTweets('BTC OR ETH OR Bitcoin OR Ethereum -is:retweet lang:en');
    await log(`Got ${cryptoNews.data?.length || 0} crypto tweets`);
    
    const healthcareNews = await searchTweets('GLP-1 OR Hims OR healthcare -is:retweet lang:en');
    await log(`Got ${healthcareNews.data?.length || 0} healthcare tweets`);
    
    // Save combined news
    await saveNews({
      timeline: timeline.data || [],
      mentions: mentions.data || [],
      search: {
        crypto: cryptoNews.data || [],
        healthcare: healthcareNews.data || []
      }
    });
    
    await log('✅ News fetch complete');
    
  } catch (err) {
    await log(`❌ Error: ${err.message}`);
  }
  
  await log('=== X API Reader Complete ===');
}

// Test mode
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { 
  getHomeTimeline, 
  getMentions, 
  searchTweets,
  getUserByUsername 
};
