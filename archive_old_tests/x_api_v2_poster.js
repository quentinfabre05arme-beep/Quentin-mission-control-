// x_api_v2_poster.js - X/Twitter API v2 Posting using twitter-api-v2 library
// Free tier: 1,500 tweets/month

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs').promises;
const path = require('path');

// Load credentials
const config = {
  appKey: process.env.API_KEY,
  appSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
};

const QUEUE_FILE = 'C:\\Users\\quent\\.openclaw\\workspace\\x_queue.json';
const LOG_FILE = 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\x_api_v2_posts.log';

async function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.appendFile(LOG_FILE, logEntry).catch(() => {});
}

async function getQueuedPost() {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf8');
    const queue = JSON.parse(data);
    const post = queue.posts.find(p => p.status === 'pending');
    return post || null;
  } catch (err) {
    await log(`Error reading queue: ${err.message}`);
    return null;
  }
}

async function markPosted(postId, tweetId) {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf8');
    const queue = JSON.parse(data);
    const post = queue.posts.find(p => p.id === postId);
    if (post) {
      post.status = 'posted';
      post.postedAt = new Date().toISOString();
      post.tweetId = tweetId;
      post.url = `https://x.com/quentinvest1/status/${tweetId}`;
      await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
      await log(`Marked post ${postId} as posted`);
    }
  } catch (err) {
    await log(`Error updating queue: ${err.message}`);
  }
}

async function postTweet(text) {
  await log(`Attempting to post: "${text.substring(0, 50)}..."`);
  
  try {
    const client = new TwitterApi(config);
    const tweet = await client.v2.tweet(text);
    
    await log(`✅ Tweet posted! ID: ${tweet.data.id}`);
    return { success: true, id: tweet.data.id };
  } catch (err) {
    await log(`❌ Error: ${err.message}`);
    if (err.code === 401) {
      await log('Authentication failed — check API keys');
    } else if (err.code === 403) {
      await log('Forbidden — check app permissions (need Write access)');
    }
    return { success: false, error: err.message };
  }
}

async function main() {
  await log('=== X API v2 Poster Starting ===');
  
  // Validate credentials
  if (!config.appKey || !config.appSecret || !config.accessToken || !config.accessSecret) {
    await log('❌ Missing API credentials in environment');
    return;
  }
  
  const post = await getQueuedPost();
  if (!post) {
    await log('No pending posts in queue');
    return;
  }
  
  const result = await postTweet(post.text);
  
  if (result.success) {
    await markPosted(post.id, result.id);
    await log(`✅ Posted: https://x.com/quentinvest1/status/${result.id}`);
  } else {
    await log(`❌ Failed to post`);
  }
  
  await log('=== X API v2 Poster Complete ===');
}

// Test mode
if (require.main === module) {
  const testMode = process.argv.includes('--test');
  
  if (testMode) {
    (async () => {
      await log('=== TEST MODE ===');
      const result = await postTweet('🧪 Test post from X API v2 automation');
      console.log(JSON.stringify(result, null, 2));
    })();
  } else {
    main().catch(async err => {
      await log(`Fatal error: ${err.message}`);
      console.error(err);
      process.exit(1);
    });
  }
}

module.exports = { postTweet };
