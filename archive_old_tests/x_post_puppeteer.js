#!/usr/bin/env node
/**
 * X Posting via Puppeteer with Stealth
 * Handles anti-bot detection, waits, verification
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

puppeteer.use(StealthPlugin());

const CONFIG = {
  chromeProfile: 'C:\\Users\\quent\\AppData\\Local\\Google\\Chrome\\User Data\\AutomationProfile',
  queueFile: 'C:\\Users\\quent\\.openclaw\\workspace\\x_queue.json',
  logFile: 'C:\\Users\\quent\\.openclaw\\workspace\\logs\\x_posts.log',
  screenshotDir: 'C:\\Users\\quent\\.openclaw\\workspace\\screenshots',
  maxRetries: 3,
  postDelay: { min: 2000, max: 5000 }
};

async function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(entry.trim());
  await fs.mkdir(path.dirname(CONFIG.logFile), { recursive: true });
  await fs.appendFile(CONFIG.logFile, entry).catch(() => {});
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

async function markPosted(postId, url = null) {
  try {
    const data = await fs.readFile(CONFIG.queueFile, 'utf8');
    const queue = JSON.parse(data);
    const post = queue.posts.find(p => p.id === postId);
    if (post) {
      post.status = 'posted';
      post.postedAt = new Date().toISOString();
      if (url) post.url = url;
      await fs.writeFile(CONFIG.queueFile, JSON.stringify(queue, null, 2));
      await log(`Marked ${postId} as posted`);
    }
  } catch (err) {
    await log(`Error updating queue: ${err.message}`);
  }
}

async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(r => setTimeout(r, delay));
}

async function postToX(text) {
  await log('Starting Puppeteer automation...');
  
  let browser;
  let attempts = 0;
  
  while (attempts < CONFIG.maxRetries) {
    attempts++;
    await log(`Attempt ${attempts}/${CONFIG.maxRetries}`);
    
    try {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: CONFIG.chromeProfile,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1920,1080'
        ]
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to X compose
      await log('Navigating to compose...');
      await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2' });
      await randomDelay(3000, 5000);
      
      // Wait for compose field
      await log('Waiting for compose field...');
      await new Promise(r => setTimeout(r, 3000));
      
      // Click on the placeholder text area
      const composeField = await page.$('div[aria-label*="Post"], div[aria-label*="happening"], div[contenteditable="true"]');
      if (!composeField) {
        await log('Trying keyboard shortcut...');
        await page.keyboard.press('KeyN');
        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (!composeField) {
        throw new Error('Compose field not found');
      }
      
      // Click and type
      await log('Clicking compose field...');
      await composeField.click();
      await randomDelay(500, 1000);
      
      await log('Typing text...');
      await page.keyboard.type(text, { delay: 50 + Math.random() * 50 });
      await randomDelay(1000, 2000);
      
      // Screenshot before submit
      await page.screenshot({ 
        path: path.join(CONFIG.screenshotDir, `before_submit_${Date.now()}.png`),
        fullPage: false 
      });
      
      // Find Post button (enabled when text entered)
      await log('Finding Post button...');
      await new Promise(r => setTimeout(r, 2000));
      
      const postButton = await page.$('button[data-testid="tweetButton"]');
      if (!postButton) {
        throw new Error('Post button not found');
      }
      
      await log('Clicking Post button...');
      await postButton.click();
      await randomDelay(3000, 5000);
      
      // Verify post appeared
      await log('Verifying post...');
      const currentUrl = page.url();
      
      if (currentUrl.includes('/status/') || await page.$('[data-testid="toast"]')) {
        await log('✅ Post successful!');
        await page.screenshot({ 
          path: path.join(CONFIG.screenshotDir, `after_post_${Date.now()}.png`) 
        });
        await browser.close();
        return { success: true, url: currentUrl };
      }
      
      throw new Error('Post verification failed');
      
    } catch (err) {
      await log(`❌ Attempt ${attempts} failed: ${err.message}`);
      if (browser) {
        await browser.close().catch(() => {});
      }
      if (attempts >= CONFIG.maxRetries) {
        return { success: false, error: err.message };
      }
      await randomDelay(5000, 10000);
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

// Main execution
(async () => {
  const post = await getQueuedPost();
  if (!post) {
    await log('No pending posts');
    process.exit(0);
  }
  
  await log(`Posting: ${post.text.substring(0, 50)}...`);
  const result = await postToX(post.text);
  
  if (result.success) {
    await markPosted(post.id, result.url);
    await log('Post complete');
    process.exit(0);
  } else {
    await log(`Failed: ${result.error}`);
    process.exit(1);
  }
})();
