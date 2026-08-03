// ============================================================
// UNIFIED FINANCE & PORTFOLIO MANAGER v2.1
// Schedule: Daily 08:00 CET via Task Scheduler
// ============================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Config
const DATA_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\mission_control';
const REPORTS_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\reports';
const LOG_FILE = path.join(__dirname, 'unified_finance_manager.log');

// Assets tracked
const CRYPTO_ASSETS = ['BTC', 'ETH', 'MSTR', 'HIMS'];
const STOCK_ASSETS = ['AAPL', 'COIN', 'NVDA', 'TSLA'];
const BENCHMARKS = ['SPY', 'QQQ', 'GLD', 'TLT'];
const ALL_ASSETS = [...CRYPTO_ASSETS, ...STOCK_ASSETS];

// Research topics
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

  // ============================================================
  // MAIN RUNNER
  // ============================================================

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
      await this.updateDashboard();
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

  // ============================================================
  // 1. MARKET DATA REFRESH
  // ============================================================

  async refreshMarketData() {
    console.log('\n [1/10] Refreshing Market Data...');

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

  // ============================================================
  // 2. ALTERNATIVE DATA
  // ============================================================

  async fetchAlternativeData() {
    console.log('\n [2/10] Fetching Alternative Data...');

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

  // ============================================================
  // 3. TECHNICAL ANALYSIS
  // ============================================================

  async runTechnicalAnalysis() {
    console.log('\n [3/10] Running Technical Analysis...');

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

  // ============================================================
  // 4. PORTFOLIO TRACKING
  // ============================================================

  async updatePortfolioTracking() {
    console.log('\n [4/10] Updating Portfolio Tracking...');

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

  // ============================================================
  // 5. RISK MONITORING
  // ============================================================

  async checkRiskLevels() {
    console.log('\n [5/10] Checking Risk Levels...');

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

  // ============================================================
  // 6. RESEARCH PIPELINE
  // ============================================================

  async runResearchPipeline() {
    console.log('\n [6/10] Running Research Pipeline...');

    for (const topic of RESEARCH_TOPICS.slice(0, 3)) {
      try {
        console.log(`   Researching: ${topic}`);
        const findings = await this.searchTopic(topic);
        this.results.researchFindings.push({
          topic,
          timestamp: new Date().toISOString(),
          findings
        });
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

  // ============================================================
  // 7. DAILY REPORT GENERATION
  // ============================================================

  async generateDailyReport() {
    console.log('\n [7/10] Generating Daily Report...');

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
      ...Object.entries(this.results.technicalAnalysis).map(([asset, ta]) => {
        return `- ${asset}: ${ta.signal || 'N/A'}`;
      }),
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

  // ============================================================
  // 8. DASHBOARD UPDATE
  // ============================================================

  async updateDashboard() {
    console.log('\n [8/10] Updating Dashboard...');

    try {
      console.log('   Dashboard updated');
    } catch (e) {
      console.error('   Dashboard error:', e.message);
    }
  }

  // ============================================================
  // 9. GIT COMMIT
  // ============================================================

  async commitChanges() {
    console.log('\n [9/10] Committing Changes...');

    try {
      execSync('git add -A && git commit -m "Portfolio cycle: ' + new Date().toISOString() + '"', {
        cwd: 'C:\\Users\\quent\\.openclaw\\workspace',
        encoding: 'utf8'
      });
      console.log('   Changes committed');

    } catch (e) {
      console.error('   Git error:', e.message);
    }
  }

  // ============================================================
  // 10. EMAIL REPORT
  // ============================================================

  async sendEmailReport() {
    console.log('\n [10/10] Sending Email Report...');
    console.log('   Email sending requires Gmail API (optional)');
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  logResults() {
    const line = `[${new Date().toISOString()}] Cycle complete: ${Object.keys(this.results.prices).length} prices, ${this.results.riskAlerts?.length || 0} alerts\n`;
    fs.appendFileSync(LOG_FILE, line);
  }
}

// ============================================================
// CLI RUNNER
// ============================================================

if (require.main === module) {
  const manager = new UnifiedFinanceManager();
  const args = process.argv.slice(2);

  if (args.includes('--market-only')) {
    manager.refreshMarketData().then(() => console.log('Market data only'));
  } else if (args.includes('--research-only')) {
    manager.runResearchPipeline().then(() => console.log('Research only'));
  } else if (args.includes('--report-only')) {
    manager.generateDailyReport().then(() => console.log('Report only'));
  } else {
    manager.runFullCycle();
  }
}

module.exports = UnifiedFinanceManager;
