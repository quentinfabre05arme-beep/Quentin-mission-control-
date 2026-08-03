const puppeteer = require('puppeteer');

async function postTweet(text) {
  try {
    // Connect to the existing browser session
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:18800',
      defaultViewport: null
    });
    
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('x.com') || p.url().includes('twitter.com')) || pages[0];
    
    if (!page) {
      console.error('No X page found');
      process.exit(1);
    }
    
    // Navigate to compose
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2' });
    
    // Wait for compose area
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
    
    // Type the post
    await page.type('[data-testid="tweetTextarea_0"]', text);
    
    // Wait a moment
    await new Promise(r => setTimeout(r, 1000));
    
    // Click post button
    await page.click('[data-testid="tweetButton"]');
    
    // Wait for confirmation
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Posted:', text);
    await browser.disconnect();
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

const text = process.argv[2] || 'Testing autonomous posting from OpenClaw AI agent. #AI #Automation';
postTweet(text);
