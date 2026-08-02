const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'browser_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class BrowserAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch(headless = true) {
    this.browser = await puppeteer.launch({ headless, args: ['--no-sandbox'] });
    this.page = await this.browser.newPage();
    log('Browser launched');
    return this;
  }

  async goto(url) {
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    log('Navigated to ' + url);
  }

  async click(selector) {
    await this.page.click(selector);
    log('Clicked ' + selector);
  }

  async type(selector, text) {
    await this.page.type(selector, text);
    log('Typed into ' + selector);
  }

  async getText(selector) {
    return await this.page.$eval(selector, el => el.textContent);
  }

  async screenshot(file) {
    await this.page.screenshot({ path: file });
    log('Screenshot saved ' + file);
  }

  async close() {
    await this.browser.close();
    log('Browser closed');
  }
}

module.exports = { BrowserAgent };

if (require.main === module) {
  (async () => {
    const agent = new BrowserAgent();
    await agent.launch();
    await agent.goto('https://example.com');
    const title = await agent.page.title();
    console.log('Page title:', title);
    await agent.close();
  })();
}
