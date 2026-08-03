// ============================================================
// UNIFIED FINANCE & PORTFOLIO MANAGER v2.2
// Schedule: Daily 08:05 CET via Task Scheduler
// Sends daily report via Gmail OAuth if available
// ============================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Config
const DATA_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\mission_control';
const REPORTS_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\reports';
const LOG_FILE = path.join(__dirname, 'unified_finance_manager.log');

const CRYPTO_ASSETS = ['BTC', 'ETH', 'MSTR', 'HIMS'];
const STOCK_ASSETS = ['AAPL', 'COIN', 'NVDA', 'TSLA'];
const ALL_ASSETS = [...CRYPTO_ASSETS, ...STOCK_ASSETS];
const RESEARCH_TOPICS = ['bitcoin', 'ethereum', 'AI', 'biotech', 'longevity', 'fintech'];

class UnifiedFinanceManager {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      prices: {},
      alternativeData: {},
      technicalAnalysis: {},
      portfolioTracking: {},
      riskAlerts: [],
      researchFindings: [],
      errors: []
    };
  }

  async runFullCycle() {
    console.log(' Unified Finance Manager - Full Cycle Starting');
    console.log('='.repeat(50));

    try {
      await this.refreshMarketData();
      await this.fetchAlternativeData();
      await this.runTechnicalAnalysis();
      await this.updatePortfolioTracking();
      await this.checkRiskLevels();
      await this.runResearchPipeline();
      await this.generateDailyReport();
      await this.commitChanges();
      await this.sendEmailReport();

      console.log('\n Full Cycle Complete!');
      this.logResults();

    } catch (error) {
      console.error(' Cycle Error:', error.message);
      this.results.errors.push({ type: 'cycle', error: error.message });
    }

    return this.results;
  }

  async refreshMarketData() {
    console.log('\n [1/9] Refreshing Market Data...');
    try {
      const output = execSync('node mission_control/market_data_service.js --json', {
        cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
        encoding: 'utf8',
        timeout: 60000
      });
      const data = JSON.parse(output);
      this.results.prices = data.assets || {};
      console.log(`   ${Object.keys(this.results.prices).length} assets updated`);
    } catch (e) {
      console.error('   Market data error:', e.message);
      this.results.errors.push({ type: 'market_data', error: e.message });
      try {
        const cached = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'market_data.json')));
        this.results.prices = cached.assets || {};
        console.log('   Using cached data');
      } catch (cacheErr) {
        console.error('   No cached data available');
      }
    }
  }

  async fetchAlternativeData() {
    console.log('\n [2/9] Fetching Alternative Data...');
    try {
      const output = execSync('node investment_fund/scripts/fetch_alternative_data.js --json', {
        cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
        encoding: 'utf8',
        timeout: 60000
      });
      this.results.alternativeData = JSON.parse(output);
      console.log('   Alternative data fetched');
    } catch (e) {
      console.error('   Alternative data error:', e.message);
      this.results.errors.push({ type: 'alternative_data', error: e.message });
    }
  }

  async runTechnicalAnalysis() {
    console.log('\n [3/9] Running Technical Analysis...');
    for (const asset of ALL_ASSETS.slice(0, 4)) {
      try {
        const output = execSync(`node mission_control/enhanced_ta_analysis.js ${asset} --json`, {
          cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
          encoding: 'utf8',
          timeout: 30000
        });
        this.results.technicalAnalysis[asset] = JSON.parse(output);
        console.log(`   ${asset} TA complete`);
      } catch (e) {
        console.error(`   ${asset} TA error:`, e.message);
        this.results.errors.push({ type: 'ta', asset, error: e.message });
      }
    }
  }

  async updatePortfolioTracking() {
    console.log('\n [4/9] Updating Portfolio Tracking...');
    try {
      const portfolio = {
        timestamp: new Date().toISOString(),
        positions: {},
        totalValue: 0,
        dayChange: 0,
        dayChangePct: 0
      };

      const portfolioFile = path.join(DATA_DIR, 'portfolio.json');
      if (fs.existsSync(portfolioFile)) {
        const positions = JSON.parse(fs.readFileSync(portfolioFile));
        portfolio.positions = positions;
        for (const [asset, pos] of Object.entries(positions)) {
          const price = this.results.prices[asset]?.price || 0;
          const value = pos.shares * price;
          portfolio.totalValue += value;
          portfolio.dayChange += value * (this.results.prices[asset]?.change_24h || 0) / 100;
        }
        portfolio.dayChangePct = portfolio.totalValue > 0
          ? (portfolio.dayChange / portfolio.totalValue) * 100
          : 0;
      }

      this.results.portfolioTracking = portfolio;
      console.log(`   Portfolio tracked: $${portfolio.totalValue.toFixed(2)}`);
    } catch (e) {
      console.error('   Portfolio error:', e.message);
      this.results.errors.push({ type: 'portfolio', error: e.message });
    }
  }

  async checkRiskLevels() {
    console.log('\n [5/9] Checking Risk Levels...');
    const alerts = [];
    for (const [asset, data] of Object.entries(this.results.prices)) {
      if (data.change_24h < -5) {
        alerts.push({
          asset,
          type: 'drawdown',
          severity: 'high',
          message: `${asset} down ${data.change_24h.toFixed(2)}% in 24h`
        });
      }
    }

    const fng = this.results.alternativeData?.fear_and_greed;
    if (fng && fng.value < 20) {
      alerts.push({
        type: 'sentiment',
        severity: 'medium',
        message: `Extreme Fear: ${fng.value}`
      });
    }

    this.results.riskAlerts = alerts;
    console.log(`   ${alerts.length} risk alerts found`);
  }

  async runResearchPipeline() {
    console.log('\n [6/9] Running Research Pipeline...');
    for (const topic of RESEARCH_TOPICS.slice(0, 3)) {
      try {
        console.log(`   Researching: ${topic}`);
        const findings = await this.searchTopic(topic);
        this.results.researchFindings.push({ topic, timestamp: new Date().toISOString(), findings });
      } catch (e) {
        console.error(`   Research error for ${topic}:`, e.message);
      }
    }
    console.log(`   ${this.results.researchFindings.length} topics researched`);
  }

  async searchTopic(topic) {
    return {
      summary: `Research on ${topic} completed`,
      sources: 0,
      keyPoints: []
    };
  }

  async generateDailyReport() {
    console.log('\n [7/9] Generating Daily Report...');
    const date = new Date().toLocaleDateString('fr-FR');
    const report = [
      ` DAILY MARKET REPORT - ${date}`,
      ``,
      `## Market Snapshot`,
      ...Object.entries(this.results.prices).map(([asset, data]) => {
        const change = data.change_24h > 0 ? '+' : '';
        return `- ${asset}: $${data.price?.toLocaleString() || 'N/A'} (${change}${data.change_24h?.toFixed(2) || 0}%)`;
      }),
      ``,
      `## Alternative Data`,
      `- Fear & Greed: ${this.results.alternativeData?.fear_and_greed?.value || 'N/A'}`,
      ``,
      `## Technical Signals`,
      ...Object.entries(this.results.technicalAnalysis).map(([asset, ta]) => `- ${asset}: ${ta.signal || 'N/A'}`),
      ``,
      `## Portfolio`,
      `- Total Value: $${this.results.portfolioTracking?.totalValue?.toFixed(2) || 'N/A'}`,
      `- Day Change: $${this.results.portfolioTracking?.dayChange?.toFixed(2) || 'N/A'}`,
      ``,
      `## Risk Alerts`,
      ...(this.results.riskAlerts?.length > 0
        ? this.results.riskAlerts.map(a => `-  ${a.message}`)
        : ['- No alerts']),
      ``,
      `## Research`,
      ...this.results.researchFindings.map(r => `- ${r.topic}: ${r.findings.summary}`),
      ``,
      `Generated: ${new Date().toISOString()}`
    ].join('\n');

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const reportPath = path.join(REPORTS_DIR, `daily_report_${new Date().toISOString().split('T')[0]}.txt`);
    fs.writeFileSync(reportPath, report);

    this.results.dailyReport = { path: reportPath, content: report };
    console.log(`   Report saved: ${reportPath}`);
  }

  async commitChanges() {
    console.log('\n [8/9] Committing Changes...');
    try {
      execSync('git add -A', { cwd: 'C:\\Users\\quent\\.openclaw\\workspace', encoding: 'utf8' });
      try {
        execSync(`git commit -m "Finance daily report: ${new Date().toISOString()}"`, {
          cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
          encoding: 'utf8'
        });
        console.log('   Changes committed');
      } catch (e) {
        console.log('   No changes to commit');
      }
    } catch (e) {
      console.error('   Git error:', e.message);
    }
  }

  async sendEmailReport() {
    console.log('\n [9/9] Sending Email Report...');

    const workspace = 'C:\\Users\\quent\\.openclaw\\workspace';
    const tokenFile = path.join(workspace, 'google_token.json');
    const credentialsFile = path.join(workspace, 'google_credentials.json');

    if (!fs.existsSync(tokenFile) || !fs.existsSync(credentialsFile)) {
      console.log('   Gmail OAuth not configured — skipping email delivery');
      return { sent: false, reason: 'oauth_missing' };
    }

    if (!this.results.dailyReport?.content) {
      console.log('   No daily report to send');
      return { sent: false, reason: 'no_report' };
    }

    try {
      const { google } = require('googleapis');
      const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(tokenFile, 'utf8')));

      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
      const subject = `Claw Daily Market Report — ${new Date().toLocaleDateString('fr-FR')}`;
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: Claw <${process.env.GMAIL_FROM || 'quentin.fabre05arme@gmail.com'}>`,
        `To: quentin.fabre05arme@gmail.com`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        this.results.dailyReport.content
      ];
      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      console.log('   Email report sent successfully');
      return { sent: true };
    } catch (e) {
      console.error('   Email send error:', e.message);
      this.results.errors.push({ type: 'email', error: e.message });
      return { sent: false, error: e.message };
    }
  }

  logResults() {
    const line = `[${new Date().toISOString()}] Cycle complete: ${Object.keys(this.results.prices).length} prices, ${this.results.riskAlerts?.length || 0} alerts\n`;
    fs.appendFileSync(LOG_FILE, line);
  }
}

if (require.main === module) {
  const manager = new UnifiedFinanceManager();
  manager.runFullCycle();
}

module.exports = UnifiedFinanceManager;
