/**
 * PROJECT CLAW CORE — X Agent
 * Post and read X/Twitter using browser automation (no API fees).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'x_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

async function getBrowser() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch(e) {
    throw new Error('Puppeteer not installed');
  }
  
  return await puppeteer.launch({
    headless: false, // Need visible browser for login
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userDataDir: path.join(__dirname, '..', 'data', 'x_profile')
  });
}

class XAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }
  
  async init() {
    log('Initializing X browser');
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
  }
  
  async post(text) {
    if (!this.page) await this.init();
    log(`Posting: ${text.slice(0, 100)}`);
    
    await this.page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for composer
    await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
    await this.page.type('div[contenteditable="true"]', text, { delay: 20 });
    
    // Click post button
    const postButton = await this.page.$('button[data-testid="tweetButtonInline"]') ||
                       await this.page.$('button[data-testid="tweetButton"]');
    if (!postButton) throw new Error('Post button not found');
    
    await postButton.click();
    await new Promise(r => setTimeout(r, 3000));
    
    log('Post submitted');
    return { success: true };
  }
  
  async readTimeline(count = 10) {
    if (!this.page) await this.init();
    log(`Reading timeline`);
    
    await this.page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const tweets = await this.page.evaluate((max) => {
      return Array.from(document.querySelectorAll('article')).slice(0, max).map(a => {
        const textEl = a.querySelector('[data-testid="tweetText"]');
        const authorEl = a.querySelector('[data-testid="User-Name"]');
        return {
          author: authorEl ? authorEl.innerText : '',
          text: textEl ? textEl.innerText : ''
        };
      });
    }, count);
    
    return tweets;
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = { XAgent };
