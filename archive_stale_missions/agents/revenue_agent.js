// Revenue Agent - Track sales, analytics, opportunities
const fs = require('fs');
const path = require('path');

const REVENUE_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\revenue';
const LOG_FILE = path.join(__dirname, 'revenue_agent.log');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

class RevenueAgent {
  async run() {
    const results = {
      timestamp: new Date().toISOString(),
      metrics: {},
      opportunities: [],
      errors: []
    };

    // 1. Load existing metrics
    try {
      log('Loading revenue metrics...');
      results.metrics = this.loadMetrics();
    } catch (e) {
      results.errors.push({ type: 'load', error: e.message });
    }

    // 2. Find opportunities
    try {
      log('Scanning for opportunities...');
      results.opportunities = await this.findOpportunities();
    } catch (e) {
      results.errors.push({ type: 'opportunities', error: e.message });
    }

    // 3. Save updated metrics
    try {
      this.saveMetrics(results.metrics);
    } catch (e) {
      results.errors.push({ type: 'save', error: e.message });
    }

    log(`Revenue check complete: ${results.opportunities.length} opportunities found`);
    return results;
  }

  loadMetrics() {
    const metricsFile = path.join(REVENUE_DIR, 'metrics.json');
    
    try {
      if (fs.existsSync(metricsFile)) {
        return JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading metrics:', e.message);
    }
    
    // Default metrics
    return {
      totalRevenue: 0,
      dailyRevenue: 0,
      activeStreams: [],
      lastUpdated: new Date().toISOString()
    };
  }

  async findOpportunities() {
    const opportunities = [];
    
    // Check for POD business data
    try {
      const podDir = 'C:\\Users\\quent\\.openclaw\\workspace\\pod_business';
      if (fs.existsSync(podDir)) {
        const files = fs.readdirSync(podDir);
        if (files.length > 0) {
          opportunities.push({
            type: 'pod_business',
            description: 'POD business files found',
            files: files.length,
            action: 'Review and launch products'
          });
        }
      }
    } catch (e) {
      console.error('Error checking POD:', e.message);
    }

    // Check for investment fund data
    try {
      const fundDir = 'C:\\Users\\quent\\.openclaw\\workspace\\investment_fund';
      if (fs.existsSync(fundDir)) {
        opportunities.push({
          type: 'investment',
          description: 'Investment fund directory exists',
          action: 'Monitor positions and signals'
        });
      }
    } catch (e) {
      console.error('Error checking fund:', e.message);
    }

    // Check for content pipeline
    try {
      const contentDir = 'C:\\Users\\quent\\.openclaw\\workspace\\content';
      if (fs.existsSync(contentDir)) {
        const files = fs.readdirSync(contentDir);
        opportunities.push({
          type: 'content',
          description: `${files.length} content files`,
          action: 'Schedule and publish content'
        });
      }
    } catch (e) {
      console.error('Error checking content:', e.message);
    }

    return opportunities;
  }

  saveMetrics(metrics) {
    if (!fs.existsSync(REVENUE_DIR)) {
      fs.mkdirSync(REVENUE_DIR, { recursive: true });
    }

    metrics.lastUpdated = new Date().toISOString();
    const metricsFile = path.join(REVENUE_DIR, 'metrics.json');
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
  }
}

module.exports = new RevenueAgent();
