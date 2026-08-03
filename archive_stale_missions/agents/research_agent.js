// Research Agent - Price fetching, news scanning, analysis
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\mission_control';
const LOG_FILE = path.join(__dirname, 'research_agent.log');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

class ResearchAgent {
  async run() {
    const results = {
      timestamp: new Date().toISOString(),
      prices: {},
      analysis: {},
      errors: []
    };

    // 1. Fetch prices
    try {
      log('Fetching prices...');
      const prices = await this.fetchPrices();
      results.prices = prices;
    } catch (e) {
      results.errors.push({ type: 'prices', error: e.message });
    }

    // 2. Run technical analysis
    try {
      log('Running technical analysis...');
      const ta = await this.runTechnicalAnalysis();
      results.analysis.technical = ta;
    } catch (e) {
      results.errors.push({ type: 'ta', error: e.message });
    }

    // 3. Save results
    try {
      this.saveResults(results);
    } catch (e) {
      results.errors.push({ type: 'save', error: e.message });
    }

    log(`Research complete: ${Object.keys(results.prices).length} prices fetched`);
    return results;
  }

  async fetchPrices() {
    // Try to run existing market data service
    try {
      const output = execSync('node market_data_service.js --json', {
        cwd: DATA_DIR,
        encoding: 'utf8',
        timeout: 30000
      });
      
      const data = JSON.parse(output);
      return data.assets || {};
    } catch (e) {
      // Fallback: return cached data
      try {
        const cached = fs.readFileSync(path.join(DATA_DIR, 'market_data.json'), 'utf8');
        return JSON.parse(cached).assets || {};
      } catch {
        return {};
      }
    }
  }

  async runTechnicalAnalysis() {
    const assets = ['BTC', 'ETH', 'MSTR', 'HIMS'];
    const results = {};
    
    for (const asset of assets) {
      try {
        const output = execSync(`node enhanced_ta_analysis.js ${asset}`, {
          cwd: DATA_DIR,
          encoding: 'utf8',
          timeout: 30000
        });
        
        // Parse output
        const lines = output.split('\n');
        results[asset] = {
          signal: lines.find(l => l.includes('Signal:'))?.split(':')[1]?.trim() || 'UNKNOWN',
          rsi: lines.find(l => l.includes('RSI:'))?.split(':')[1]?.trim() || 'N/A'
        };
      } catch (e) {
        results[asset] = { error: e.message };
      }
    }
    
    return results;
  }

  saveResults(results) {
    const outputFile = path.join(DATA_DIR, 'research_results.json');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    
    // Also append to daily log
    const dailyLog = path.join(DATA_DIR, 'research_log.txt');
    const summary = `[${results.timestamp}] Research: ${Object.keys(results.prices).length} assets, ${results.errors.length} errors\n`;
    fs.appendFileSync(dailyLog, summary);
  }
}

module.exports = new ResearchAgent();
