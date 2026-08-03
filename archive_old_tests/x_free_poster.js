// Free X/Twitter Posting Script - No API Required
// Uses browser automation via Chrome DevTools Protocol
// Part of OpenClaw autonomous system

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  chromeProfile: 'C:\\Users\\quent\\AppData\\Local\\Google\\Chrome\\User Data',
  queueFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_queue.json',
  logFile: 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\x_posts.log',
  maxRetries: 3
};

async function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  await fs.appendFile(CONFIG.logFile, logEntry).catch(() => {});
}

async function getQueuedPost() {
  try {
    const data = await fs.readFile(CONFIG.queueFile, 'utf8');
    const queue = JSON.parse(data);
    return queue.posts.find(p => p.status === 'pending');
  } catch (err) {
    await log(`Error reading queue: ${err.message}`);
    return null;
  }
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

// Browser automation using Chrome CDP
async function postToX(text) {
  await log(`Attempting to post: "${text.substring(0, 50)}..."`);
  
  // This uses Playwright with Chrome profile for session persistence
  const playwrightScript = `
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext(
    'C:\\\\Users\\\\quent\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\User Data',
    {
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    }
  );
  
  const page = await browser.newPage();
  
  // Check if already logged in
  await page.goto('https://x.com/home');
  await page.waitForTimeout(3000);
  
  // Check if we're on login page
  const url = page.url();
  if (url.includes('login')) {
    console.log('LOGIN_REQUIRED');
    await browser.close();
    process.exit(1);
  }
  
  // Click compose button
  await page.click('[data-testid="SideNav_NewTweet_Button"]');
  await page.waitForTimeout(1000);
  
  // Type the tweet
  const composeBox = await page.locator('[data-testid="tweetTextarea_0"]').or(
    page.locator('div[role="textbox"][contenteditable="true"]')
  );
  await composeBox.fill(process.argv[2]);
  await page.waitForTimeout(500);
  
  // Click post button
  await page.click('[data-testid="tweetButton"]');
  await page.waitForTimeout(3000);
  
  // Verify posted
  const posted = await page.locator('[data-testid="toast"]').isVisible().catch(() => false);
  console.log(posted ? 'SUCCESS' : 'FAILED');
  
  await browser.close();
})();
  `;
  
  // For now, log the attempt and return simulated success
  // In production, this would execute the Playwright script
  await log(`Post would be sent: "${text}"`);
  await log('Note: Actual posting requires manual Chrome session or XActions MCP server setup');
  
  return { success: true, simulated: true };
}

async function showStatus() {
  await log('=== X Free Poster Status ===');
  const post = await getQueuedPost();
  if (!post) {
    await log('No pending posts in queue');
  } else {
    await log(`Next pending post: ${post.id} | scheduled ${post.scheduled_date} ${post.scheduled_time} | ${post.text.substring(0, 60)}...`);
  }
  await log('=== Status Complete ===');
}

async function main() {
  const args = process.argv.slice(2);
  const isStatus = args.includes('status') || args.includes('--status') || args.includes('-s');
  
  if (isStatus) {
    return showStatus();
  }
  
  await log('=== X Free Poster Starting ===');
  
  const post = await getQueuedPost();
  if (!post) {
    await log('No pending posts in queue');
    return;
  }
  
  await log(`Found post: ${post.id}`);
  const result = await postToX(post.text);
  
  // Only mark as posted if the browser automation actually succeeded.
  // Simulated runs must NOT mutate the queue.
  if (result.success && !result.simulated) {
    await markPosted(post.id);
    await log('Post completed successfully');
  } else if (result.simulated) {
    await log('Simulated run - queue unchanged');
  } else {
    await log('Post failed - will retry on next run');
  }
  
  await log('=== X Free Poster Complete ===');
}

main().catch(async err => {
  await log(`Fatal error: ${err.message}`);
  process.exit(1);
});
