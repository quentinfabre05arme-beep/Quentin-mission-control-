/**
 * PROJECT CLAW CORE — LinkedIn Agent
 * Browser-based LinkedIn operations.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'linkedin_agent.log');
const PROFILE_DIR = path.join(__dirname, '..', 'data', 'linkedin_profile');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

async function getBrowser(visible = true) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch(e) {
    throw new Error('Puppeteer not installed');
  }
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  return await puppeteer.launch({
    headless: !visible,
    userDataDir: PROFILE_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

class LinkedInAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }
  
  async init(visible = true) {
    this.browser = await getBrowser(visible);
    this.page = await this.browser.newPage();
  }
  
  async getProfile(url) {
    if (!this.page) await this.init();
    log(`Opening LinkedIn profile: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const info = await this.page.evaluate(() => ({
      title: document.title,
      headline: document.querySelector('h1')?.innerText?.trim() || '',
      text: document.body.innerText.slice(0, 500)
    }));
    
    return { success: true, ...info };
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = { LinkedInAgent };

if (require.main === module) {
  (async () => {
    const agent = new LinkedInAgent();
    try {
      const info = await agent.getProfile('https://www.linkedin.com/in/williamhgates/');
      console.log(JSON.stringify(info, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    } finally {
      await agent.close();
    }
  })();
}
