// xactions_poster.js - X Posting via XActions MCP
// Uses auth_token for session-based authentication (no browser needed)

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  authToken: process.env.XACTIONS_SESSION_COOKIE || '9067dbd3e390766b7eae9e05eb4e931215ea0d33',
  queueFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_queue.json',
  logFile: 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\xactions_posts.log'
};

async function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true });
  await fs.appendFile(CONFIG.logFile, logEntry).catch(() => {});
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

async function postViaXActions(text) {
  await log('Attempting post via XActions MCP...');
  
  return new Promise((resolve, reject) => {
    // Use xactions-mcp CLI
    const cmd = `npx xactions-mcp post "${text.replace(/"/g, '\\"')}"`;
    
    exec(cmd, { 
      cwd: 'C:\\Users\\quent\\.openclaw\\workspace\\xactions-toolkit',
      env: { ...process.env, XACTIONS_SESSION_COOKIE: CONFIG.authToken }
    }, (error, stdout, stderr) => {
      if (error) {
        log(`XActions error: ${error.message}`);
        resolve({ success: false, error: error.message });
      } else {
        log(`XActions output: ${stdout}`);
        resolve({ success: stdout.includes('success') || stdout.includes('posted'), output: stdout });
      }
    });
  });
}

async function markPosted(postId) {
  try {
    const data = await fs.readFile(CONFIG.queueFile, 'utf8');
    const queue = JSON.parse(data);
    const post = queue.posts.find(p => p.id === postId);
    if (post) {
      post.status = 'posted';
      post.postedAt = new Date().toISOString();
      await fs.writeFile(CONFIG.queueFile, JSON.stringify(queue, null, 2));
      await log(`Marked post ${postId} as posted`);
    }
  } catch (err) {
    await log(`Error updating queue: ${err.message}`);
  }
}

async function main() {
  await log('=== XActions Poster Starting ===');
  
  const post = await getQueuedPost();
  if (!post) {
    await log('No pending posts in queue');
    return;
  }
  
  await log(`Posting: "${post.text.substring(0, 50)}..."`);
  const result = await postViaXActions(post.text);
  
  if (result.success) {
    await markPosted(post.id);
    await log('✅ Post successful via XActions');
  } else {
    await log(`❌ Post failed: ${result.error || 'Unknown error'}`);
  }
  
  await log('=== XActions Poster Complete ===');
}

main().catch(async err => {
  await log(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
