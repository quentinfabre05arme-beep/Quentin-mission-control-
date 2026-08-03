/**
 * PROJECT CLAW CORE — GitHub Agent
 * Browser-based GitHub operations (reads repo, creates issues).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'github_agent.log');
const PROFILE_DIR = path.join(__dirname, '..', 'data', 'github_profile');

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

class GitHubAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }
  
  async init(visible = true) {
    this.browser = await getBrowser(visible);
    this.page = await this.browser.newPage();
  }
  
  async readRepo(owner, repo) {
    if (!this.page) await this.init();
    log(`Reading repo: ${owner}/${repo}`);
    await this.page.goto(`https://github.com/${owner}/${repo}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const info = await this.page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('[data-testid="about-description"], .repository-content .BorderGrid-cell p')?.innerText || '',
      stars: document.querySelector('[href$="/stargazers"]')?.innerText.trim() || '',
      forks: document.querySelector('[href$="/forks"]')?.innerText.trim() || ''
    }));
    
    return { success: true, ...info };
  }
  
  async createIssue(owner, repo, title, body) {
    if (!this.page) await this.init();
    log(`Creating issue: ${owner}/${repo} - ${title}`);
    await this.page.goto(`https://github.com/${owner}/${repo}/issues/new`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await this.page.type('#issue_title', title, { delay: 30 });
    await this.page.type('#issue_body', body, { delay: 10 });
    
    const submit = await this.page.$('button[type="submit"].btn-primary');
    if (submit) await submit.click();
    
    await new Promise(r => setTimeout(r, 3000));
    return { success: true, url: this.page.url() };
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = { GitHubAgent };

if (require.main === module) {
  (async () => {
    const agent = new GitHubAgent();
    try {
      const info = await agent.readRepo('openclaw', 'openclaw');
      console.log(JSON.stringify(info, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    } finally {
      await agent.close();
    }
  })();
}
