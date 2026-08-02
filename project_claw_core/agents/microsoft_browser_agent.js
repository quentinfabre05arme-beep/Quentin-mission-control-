/**
 * PROJECT CLAW CORE — Microsoft Browser Agent
 * Access Outlook, OneDrive, Calendar via browser automation (no Azure app needed).
 * Requires Chrome/Edge logged into a Microsoft account.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'microsoft_browser_agent.log');
const PROFILE_DIR = path.join(__dirname, '..', 'data', 'microsoft_profile');

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
    throw new Error('Puppeteer not installed. Run: npm install puppeteer');
  }
  
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  return await puppeteer.launch({
    headless: !visible,
    userDataDir: PROFILE_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

class MicrosoftBrowserAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }
  
  async init(visible = true) {
    this.browser = await getBrowser(visible);
    this.page = await this.browser.newPage();
    this.page.setViewport({ width: 1280, height: 900 });
  }
  
  async openOutlook() {
    if (!this.page) await this.init();
    log('Opening Outlook');
    await this.page.goto('https://outlook.live.com/mail/0/', { waitUntil: 'networkidle2', timeout: 60000 });
    await this.page.waitForTimeout(5000);
    return { success: true, url: this.page.url() };
  }
  
  async readOutlookInbox(count = 5) {
    const opened = await this.openOutlook();
    if (!opened.success) return opened;
    
    log('Reading Outlook inbox');
    await this.page.waitForSelector('[data-testid="ThreadListItem"], [role="listitem"]', { timeout: 15000 }).catch(() => {});
    
    const emails = await this.page.evaluate((max) => {
      const items = document.querySelectorAll('[data-testid="ThreadListItem"], [role="listitem"]');
      const result = [];
      for (let i = 0; i < Math.min(items.length, max); i++) {
        const el = items[i];
        const senderEl = el.querySelector('[title]');
        const subjectEl = el.querySelector('[data-testid="MessagePreview.Subject"], .Q93Pwc, span');
        result.push({
          sender: senderEl ? senderEl.textContent.trim() : '',
          subject: subjectEl ? subjectEl.textContent.trim() : '',
          preview: el.innerText.slice(0, 200)
        });
      }
      return result;
    }, count);
    
    return { success: true, emails };
  }
  
  async sendOutlookEmail(to, subject, body) {
    if (!this.page) await this.init();
    await this.openOutlook();
    log(`Composing email to ${to}`);
    
    await this.page.goto('https://outlook.live.com/mail/0/deeplink/compose', { waitUntil: 'networkidle2', timeout: 60000 });
    await this.page.waitForTimeout(3000);
    
    // Fill recipient
    await this.page.waitForSelector('input[role="combobox"], div[contenteditable="true"]', { timeout: 15000 }).catch(() => {});
    await this.page.type('input[aria-label="To"], input[role="combobox"]', to, { delay: 50 }).catch(() => {});
    
    // Subject
    await this.page.type('input[aria-label="Add a subject"], input[placeholder*="subject" i]', subject, { delay: 30 }).catch(() => {});
    
    // Body
    await this.page.type('div[aria-label="Message body"], div[contenteditable="true"]', body, { delay: 10 }).catch(() => {});
    
    // Send button
    await this.page.click('button[aria-label="Send"], button[data-testid="SendButton"]').catch(() => {});
    
    log('Email send attempted');
    return { success: true };
  }
  
  async readCalendar(days = 7) {
    if (!this.page) await this.init();
    log('Opening Calendar');
    await this.page.goto('https://outlook.live.com/calendar/0/view/week', { waitUntil: 'networkidle2', timeout: 60000 });
    await this.page.waitForTimeout(5000);
    
    const events = await this.page.evaluate(() => {
      const items = document.querySelectorAll('[role="button"], [data-testid]');
      return Array.from(items).slice(0, 20).map(el => el.innerText).filter(t => t.length > 0 && t.length < 200);
    });
    
    return { success: true, events };
  }
  
  async listOneDrive(count = 10) {
    if (!this.page) await this.init();
    log('Opening OneDrive');
    await this.page.goto('https://onedrive.live.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    await this.page.waitForTimeout(5000);
    
    const files = await this.page.evaluate((max) => {
      const items = document.querySelectorAll('[data-testid="list-item"], [role="row"], .ms-DetailsRow, .DriveItemTile');
      return Array.from(items).slice(0, max).map(el => el.innerText.trim()).filter(t => t);
    }, count);
    
    return { success: true, files };
  }
  
  async screenshot(outputPath) {
    if (!this.page) await this.init();
    const file = outputPath || path.join(__dirname, '..', 'logs', `microsoft_screenshot_${Date.now()}.png`);
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

module.exports = { MicrosoftBrowserAgent };

if (require.main === module) {
  (async () => {
    const agent = new MicrosoftBrowserAgent();
    try {
      await agent.init(true);
      const result = await agent.readOutlookInbox(3);
      console.log(JSON.stringify(result, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    } finally {
      await agent.close();
    }
  })();
}
