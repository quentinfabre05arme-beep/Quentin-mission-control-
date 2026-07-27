/**
 * SWING TRADING MONITOR
 * Automated portfolio monitoring and alerts
 * 
 * Runs continuously: node swing_monitor.js
 * Or cron: Every 30 minutes during market hours
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  portfolioFile: path.join(__dirname, 'swing_portfolio.json'),
  alertFile: path.join(__dirname, 'swing_alerts.json'),
  logFile: path.join(__dirname, 'logs', 'swing_monitor.log'),
  marketOpen: 930,   // 9:30 AM ET
  marketClose: 1600, // 4:00 PM ET
  checkInterval: 30 * 60 * 1000 // 30 minutes
};

class SwingMonitor {
  constructor() {
    this.portfolio = this.loadPortfolio();
    this.alerts = this.loadAlerts();
    this.ensureLogDir();
  }

  ensureLogDir() {
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(CONFIG.logFile, logEntry);
  }

  loadPortfolio() {
    if (fs.existsSync(CONFIG.portfolioFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.portfolioFile, 'utf8'));
    }
    return { positions: [], balance: 100000 };
  }

  loadAlerts() {
    if (fs.existsSync(CONFIG.alertFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.alertFile, 'utf8'));
    }
    return { alerts: [], lastCheck: null };
  }

  saveAlerts() {
    fs.writeFileSync(CONFIG.alertFile, JSON.stringify(this.alerts, null, 2));
  }

  /**
   * Check if market is open
   */
  isMarketOpen() {
    const now = new Date();
    const etHour = now.getUTCHours() - 4; // Rough ET conversion
    const etMinute = now.getUTCMinutes();
    const timeVal = etHour * 100 + etMinute;
    
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    
    return isWeekday && timeVal >= CONFIG.marketOpen && timeVal <= CONFIG.marketClose;
  }

  /**
   * Get prices for all positions
   */
  async getPrices() {
    const prices = {};
    
    for (const position of this.portfolio.positions) {
      try {
        const result = execSync(
          `node "${path.join(__dirname, 'get_price.js')}" ${position.symbol}`,
          { encoding: 'utf8', timeout: 10000 }
        );
        
        // Parse price from output (handle both US and French locales)
        const lines = result.split('\n');
        const priceLine = lines.find(l => l.includes('💰'));
        if (priceLine) {
          // Match $X,XXX.XX or $XX,XX (French locale)
          const match = priceLine.match(/\$([\d\.,]+)/);
          if (match) {
            let priceStr = match[1];
            // Handle French locale: $34,39 -> 34.39
            // Handle US locale: $1,234.56 -> 1234.56
            if (priceStr.includes(',') && priceStr.includes('.')) {
              // US format: remove commas
              priceStr = priceStr.replace(/,/g, '');
            } else if (priceStr.includes(',')) {
              // Could be French decimal or US thousands
              // If comma is followed by exactly 2 digits at end, it's decimal
              if (/,\d{2}$/.test(priceStr)) {
                priceStr = priceStr.replace(',', '.');
              } else {
                priceStr = priceStr.replace(/,/g, '');
              }
            }
            prices[position.symbol] = parseFloat(priceStr);
          }
        }
      } catch (e) {
        this.log(`Failed to get price for ${position.symbol}: ${e.message}`);
      }
      
      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return prices;
  }

  /**
   * Check stops and targets
   */
  checkStopsAndTargets(prices) {
    const newAlerts = [];
    
    for (const position of this.portfolio.positions) {
      if (position.status !== 'open') continue;
      
      const currentPrice = prices[position.symbol];
      if (!currentPrice) {
        this.log(`No price data for ${position.symbol}`);
        continue;
      }
      
      const pnl = (currentPrice - position.entryPrice) / position.entryPrice;
      const daysHeld = Math.floor((Date.now() - new Date(position.entryDate).getTime()) / (1000 * 60 * 60 * 24));
      
      // Check stop loss
      if (currentPrice <= position.stopLoss) {
        newAlerts.push({
          type: 'STOP_LOSS',
          symbol: position.symbol,
          currentPrice,
          stopPrice: position.stopLoss,
          pnl: (currentPrice - position.entryPrice) * position.shares,
          action: 'EXIT IMMEDIATELY'
        });
        this.log(`🚨 STOP LOSS TRIGGERED: ${position.symbol} at $${currentPrice} (stop: $${position.stopLoss})`);
      }
      
      // Check profit targets
      for (let i = 0; i < position.targets.length; i++) {
        const target = position.targets[i];
        if (currentPrice >= target && !position.scaleOuts?.find(s => s.targetIndex === i)) {
          newAlerts.push({
            type: 'PROFIT_TARGET',
            symbol: position.symbol,
            currentPrice,
            targetPrice: target,
            targetLevel: i + 1,
            pnl: (currentPrice - position.entryPrice) * position.shares,
            action: 'SCALE OUT RECOMMENDED'
          });
          this.log(`🎯 PROFIT TARGET ${i + 1} HIT: ${position.symbol} at $${currentPrice} (target: $${target.toFixed(2)})`);
        }
      }
      
      // Time-based check (hold > 30 days without target)
      if (daysHeld > 30 && pnl < 0) {
        newAlerts.push({
          type: 'TIME_STOP',
          symbol: position.symbol,
          daysHeld,
          pnl,
          action: 'REVIEW POSITION'
        });
        this.log(`⏰ TIME STOP: ${position.symbol} held ${daysHeld} days at ${(pnl * 100).toFixed(1)}%`);
      }
      
      // Large move alert (>5% in a day)
      if (Math.abs(currentPrice - position.entryPrice) / position.entryPrice > 0.05) {
        newAlerts.push({
          type: 'LARGE_MOVE',
          symbol: position.symbol,
          currentPrice,
          entryPrice: position.entryPrice,
          move: (currentPrice - position.entryPrice) / position.entryPrice * 100,
          action: 'REVIEW'
        });
        this.log(`📈 LARGE MOVE: ${position.symbol} moved ${((currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1)}%`);
      }
    }
    
    return newAlerts;
  }

  /**
   * Generate daily summary
   */
  generateSummary(prices) {
    const positions = this.portfolio.positions;
    if (positions.length === 0) {
      return 'No open positions';
    }
    
    let totalPnl = 0;
    let totalValue = 0;
    
    const positionSummaries = positions.map(p => {
      const currentPrice = prices[p.symbol] || p.entryPrice;
      const value = currentPrice * p.shares;
      const cost = p.entryPrice * p.shares;
      const pnl = value - cost;
      const pnlPct = (currentPrice / p.entryPrice - 1) * 100;
      
      totalPnl += pnl;
      totalValue += value;
      
      const days = Math.floor((Date.now() - new Date(p.entryDate).getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        symbol: p.symbol,
        pnl,
        pnlPct,
        days,
        value,
        currentPrice
      };
    });
    
    return {
      positions: positionSummaries,
      totalPnl,
      totalValue,
      cash: this.portfolio.balance,
      equity: totalValue + this.portfolio.balance,
      deployed: (totalValue / (totalValue + this.portfolio.balance)) * 100
    };
  }

  /**
   * Main monitoring loop
   */
  async run() {
    this.log('='.repeat(60));
    this.log('SWING TRADING MONITOR STARTED');
    this.log(`Market hours: ${CONFIG.marketOpen} - ${CONFIG.marketClose} ET`);
    this.log(`Check interval: ${CONFIG.checkInterval / 60000} minutes`);
    this.log('='.repeat(60));
    
    while (true) {
      try {
        const now = new Date();
        const isOpen = this.isMarketOpen();
        
        this.log(`\n[${now.toISOString()}] Check started`);
        this.log(`Market: ${isOpen ? 'OPEN' : 'CLOSED'}`);
        this.log(`Positions: ${this.portfolio.positions.length}`);
        
        if (this.portfolio.positions.length === 0) {
          this.log('No positions to monitor');
        } else {
          // Get current prices
          this.log('Fetching prices...');
          const prices = await this.getPrices();
          
          // Check stops and targets
          this.log('Checking stops and targets...');
          const newAlerts = this.checkStopsAndTargets(prices);
          
          // Generate summary
          const summary = this.generateSummary(prices);
          
          // Save alerts
          this.alerts.alerts = [...this.alerts.alerts, ...newAlerts];
          this.alerts.lastCheck = now.toISOString();
          this.saveAlerts();
          
          // Log summary
          if (typeof summary === 'object') {
            this.log(`\n--- PORTFOLIO SUMMARY ---`);
            this.log(`Total P&L: $${summary.totalPnl.toFixed(2)}`);
            this.log(`Total Value: $${summary.totalValue.toLocaleString()}`);
            this.log(`Cash: $${summary.cash.toLocaleString()}`);
            this.log(`Equity: $${summary.equity.toLocaleString()}`);
            this.log(`Deployed: ${summary.deployed.toFixed(1)}%`);
            
            summary.positions.forEach(p => {
              const emoji = p.pnl >= 0 ? '✅' : '❌';
              this.log(`${emoji} ${p.symbol}: $${p.pnl.toFixed(2)} (${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(1)}%) | ${p.days}d | $${p.currentPrice.toFixed(2)}`);
            });
          }
          
          // Alert on action needed
          if (newAlerts.length > 0) {
            this.log(`\n⚠️ ACTION REQUIRED: ${newAlerts.length} alerts`);
            newAlerts.forEach(a => {
              this.log(`   ${a.type}: ${a.symbol} - ${a.action}`);
            });
          }
        }
        
        this.log(`\nCheck complete. Next: ${new Date(Date.now() + CONFIG.checkInterval).toISOString()}`);
        
      } catch (error) {
        this.log(`ERROR: ${error.message}`);
      }
      
      // Wait for next check
      await new Promise(r => setTimeout(r, CONFIG.checkInterval));
    }
  }

  /**
   * Single check (for cron use)
   */
  async checkOnce() {
    this.log('='.repeat(60));
    this.log(`[${new Date().toISOString()}] Single check mode`);
    
    this.portfolio = this.loadPortfolio();
    
    if (this.portfolio.positions.length === 0) {
      this.log('No positions to monitor');
      return { alerts: 0 };
    }
    
    const prices = await this.getPrices();
    const newAlerts = this.checkStopsAndTargets(prices);
    
    this.alerts.alerts = [...this.alerts.alerts, ...newAlerts];
    this.alerts.lastCheck = new Date().toISOString();
    this.saveAlerts();
    
    const summary = this.generateSummary(prices);
    
    this.log(`\n--- SUMMARY ---`);
    if (typeof summary === 'object') {
      this.log(`P&L: $${summary.totalPnl.toFixed(2)} | Equity: $${summary.equity.toLocaleString()}`);
      this.log(`Alerts: ${newAlerts.length}`);
    }
    
    return {
      alerts: newAlerts.length,
      positions: this.portfolio.positions.length,
      summary: typeof summary === 'object' ? summary : null
    };
  }
}

// CLI
async function main() {
  const monitor = new SwingMonitor();
  const mode = process.argv[2];
  
  if (mode === 'once') {
    // Single check (for cron)
    const result = await monitor.checkOnce();
    process.exit(0);
  } else {
    // Continuous monitoring
    monitor.run().catch(err => {
      monitor.log(`FATAL ERROR: ${err.message}`);
      process.exit(1);
    });
  }
}

main();
