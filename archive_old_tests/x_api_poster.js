// x_api_poster.js - X/Twitter API v2 Posting (Free tier: 1,500 tweets/month)
// Uses OAuth 1.0a authentication

const crypto = require('crypto');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Load config
require('dotenv').config({ path: 'C:\\Users\\quent\\.openclaw\\workspace\\x-api-config\\.env' });

const CONFIG = {
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  queueFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_queue.json',
  logFile: 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\x_api_posts.log'
};

async function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true });
  await fs.appendFile(CONFIG.logFile, logEntry).catch(() => {});
}

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const signingKey = encodeURIComponent(consumerSecret) + '&' + encodeURIComponent(tokenSecret);
  
  const sortedParams = Object.keys(params).sort().map(key => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
  
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

// Build OAuth header
function buildOAuthHeader(method, url, text) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const params = {
    oauth_consumer_key: CONFIG.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: CONFIG.accessToken,
    oauth_version: '1.0',
    status: text
  };
  
  params.oauth_signature = generateOAuthSignature(
    method, 
    url, 
    params, 
    CONFIG.apiSecret, 
    CONFIG.accessTokenSecret
  );
  
  const header = 'OAuth ' + Object.keys(params).map(key => {
    return encodeURIComponent(key) + '="' + encodeURIComponent(params[key]) + '"';
  }).join(', ');
  
  return header;
}

// Post tweet via X API v1.1 (since v2 requires Bearer token for write)
async function postTweet(text) {
  await log(`Attempting to post: "${text.substring(0, 50)}..."`);
  
  const url = 'https://api.twitter.com/1.1/statuses/update.json';
  const oauthHeader = buildOAuthHeader('POST', url, text);
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.twitter.com',
      path: '/1.1/statuses/update.json',
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            log(`✅ Tweet posted successfully! ID: ${json.id_str}`);
            resolve({ success: true, id: json.id_str, url: `https://x.com/quentinvest1/status/${json.id_str}` });
          } else {
            log(`❌ API Error: ${json.errors?.[0]?.message || data}`);
            resolve({ success: false, error: json.errors?.[0]?.message || 'Unknown error' });
          }
        } catch (e) {
          log(`❌ Parse error: ${e.message}`);
          resolve({ success: false, error: e.message });
        }
      });
    });
    
    req.on('error', (err) => {
      log(`❌ Request error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.write(`status=${encodeURIComponent(text)}`);
    req.end();
  });
}

async function getQueuedPost() {
  try {
    const data = await fs.readFile(CONFIG.queueFile, 'utf8');
    const queue = JSON.parse(data);
    const post = queue.posts.find(p => p.status === 'pending');
    return post || null;
  } catch (err) {
    await log(`Error reading queue: ${err.message}`);
    return null;
  }
}

async function markPosted(postId, tweetUrl) {
  try {
    const data = await fs.readFile(CONFIG.queueFile, 'utf8');
    const queue = JSON.parse(data);
    const post = queue.posts.find(p => p.id === postId);
    if (post) {
      post.status = 'posted';
      post.postedAt = new Date().toISOString();
      post.url = tweetUrl;
      await fs.writeFile(CONFIG.queueFile, JSON.stringify(queue, null, 2));
      await log(`Marked post ${postId} as posted`);
    }
  } catch (err) {
    await log(`Error updating queue: ${err.message}`);
  }
}

async function main() {
  await log('=== X API Poster Starting ===');
  
  // Validate config
  if (!CONFIG.apiKey || !CONFIG.apiSecret || !CONFIG.accessToken || !CONFIG.accessTokenSecret) {
    await log('❌ Missing API credentials');
    return;
  }
  
  const post = await getQueuedPost();
  if (!post) {
    await log('No pending posts in queue');
    return;
  }
  
  const result = await postTweet(post.text);
  
  if (result.success) {
    await markPosted(post.id, result.url);
    await log(`✅ Success: ${result.url}`);
  } else {
    await log(`❌ Failed: ${result.error}`);
  }
  
  await log('=== X API Poster Complete ===');
}

// Test mode: post a test tweet if called directly
if (require.main === module) {
  const testMode = process.argv.includes('--test');
  
  if (testMode) {
    (async () => {
      await log('=== TEST MODE ===');
      const result = await postTweet('🧪 Test post from X API automation — will delete');
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
