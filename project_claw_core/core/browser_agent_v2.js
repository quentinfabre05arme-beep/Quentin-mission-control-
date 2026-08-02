/**
 * PROJECT CLAW CORE — Browser Agent v3
 * Real browser automation with Puppeteer.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'browser_agent.log');

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
    throw new Error('Puppeteer not installed. Run: npm install puppeteer');
  }
  
  return await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

class BrowserAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }
  
  async open(url) {
    log(`Opening: ${url}`);
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    return { success: true, url };
  }
  
  async getText() {
    if (!this.page) throw new Error('No page open');
    const text = await this.page.evaluate(() => document.body.innerText);
    return text.slice(0, 5000);
  }
  
  async click(selectorOrText) {
    if (!this.page) throw new Error('No page open');
    log(`Clicking: ${selectorOrText}`);
    
    // Try selector first
    try {
      await this.page.click(selectorOrText);
      return { success: true };
    } catch(e) {}
    
    // Try text content
    const clicked = await this.page.evaluate((text) => {
      const elements = Array.from(document.querySelectorAll('*'));
      const el = elements.find(e => e.textContent.trim().includes(text));
      if (el) { el.click(); return true; }
      return false;
    }, selectorOrText);
    
    return { success: clicked };
  }
  
  async type(selector, text) {
    if (!this.page) throw new Error('No page open');
    log(`Typing into ${selector}: ${text.slice(0, 50)}`);
    await this.page.type(selector, text, { delay: 50 });
    return { success: true };
  }
  
  async screenshot(outputPath) {
    if (!this.page) throw new Error('No page open');
    const file = outputPath || path.join(__dirname, '..', 'logs', `screenshot_${Date.now()}.png`);
    await this.page.screenshot({ path: file, fullPage: true });
    return { success: true, path: file };
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = { BrowserAgent };

if (require.main === module) {
  (async () => {
    const agent = new BrowserAgent();
    try {
      await agent.open('https://example.com');
      const text = await agent.getText();
      console.log('Page text:', text.slice(0, 200));
    } catch(e) {
      console.error('Error:', e.message);
    } finally {
      await agent.close();
    }
  })();
}
