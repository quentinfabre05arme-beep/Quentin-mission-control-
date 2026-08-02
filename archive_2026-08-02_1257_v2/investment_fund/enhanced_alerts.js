// Enhanced Alert System with Partial Profits, Stops, Time Alerts
const fs = require('fs').promises;
const path = require('path');

class EnhancedAlertSystem {
  constructor() {
    this.alertsDir = path.join(__dirname, 'paper_trading', 'alerts');
    this.positionsFile = path.join(__dirname, 'paper_trading', 'positions.json');
    this.ensureDir();
  }

  async ensureDir() {
    try {
      await fs.mkdir(this.alertsDir, { recursive: true });
    } catch {}
  }

  async loadPositions() {
    try {
      const data = await fs.readFile(this.positionsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async savePositions(positions) {
    await fs.writeFile(this.positionsFile, JSON.stringify(positions, null, 2));
  }

  // ENTRY alert with full rationale
  async alertEntry(position) {
    const alert = {
      type: 'ENTRY',
      timestamp: new Date().toISOString(),
      symbol: position.symbol,
      side: position.side,
      size: position.size,
      entryPrice: position.entryPrice,
      stopLoss: position.stopLoss,
      targets: {
        t1: position.entryPrice * 1.25,  // +25%
        t2: position.entryPrice * 1.50,  // +50%
        t3: position.entryPrice * 2.00   // +100%
      },
      tier: position.tier,
      rationale: position.rationale,
      riskReward: ((position.target - position.entryPrice) / (position.entryPrice - position.stopLoss)).toFixed(2),
      timeStop: new Date(Date.now() + position.timeHorizon * 24 * 60 * 60 * 1000).toISOString()
    };

    await this.logAlert(alert);
    await this.sendTelegram(alert);
    
    // Add to positions
    const positions = await this.loadPositions();
    positions.push({
      ...position,
      targetsHit: [],
      partialExits: [],
      entryTime: new Date().toISOString()
    });
    await this.savePositions(positions);
    
    return alert;
  }

  // PARTIAL PROFIT alert
  async alertPartialProfit(position, targetLevel, exitPrice, sharesExited) {
    const pnl = (exitPrice - position.entryPrice) * sharesExited;
    const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1);
    
    const alert = {
      type: 'PARTIAL_PROFIT',
      timestamp: new Date().toISOString(),
      symbol: position.symbol,
      targetLevel: `+${targetLevel}%`,
      exitPrice,
      sharesExited,
      pnl: pnl.toFixed(2),
      pnlPct: `${pnlPct}%`,
      remainingShares: position.shares - sharesExited,
      message: `✅ ${position.symbol}: Took ${targetLevel}% profit at $${exitPrice}. P&L: €${pnl.toFixed(0)}. Moving stop to breakeven.`
    };

    await this.logAlert(alert);
    await this.sendTelegram(alert);
    
    // Update position
    const positions = await this.loadPositions();
    const idx = positions.findIndex(p => p.symbol === position.symbol && !p.closed);
    if (idx >= 0) {
      positions[idx].targetsHit.push(targetLevel);
      positions[idx].partialExits.push({ level: targetLevel, price: exitPrice, shares: sharesExited });
      positions[idx].shares -= sharesExited;
      // Move stop to breakeven after first target
      if (targetLevel === 25) {
        positions[idx].stopLoss = position.entryPrice;
      }
      await this.savePositions(positions);
    }
    
    return alert;
  }

  // STOP MOVED alert
  async alertStopMoved(position, newStop, reason) {
    const alert = {
      type: 'STOP_MOVED',
      timestamp: new Date().toISOString(),
      symbol: position.symbol,
      oldStop: position.stopLoss,
      newStop,
      reason,
      message: `🔄 ${position.symbol}: Stop moved $${position.stopLoss} → $${newStop}. Reason: ${reason}`
    };

    await this.logAlert(alert);
    await this.sendTelegram(alert);
    
    // Update position
    const positions = await this.loadPositions();
    const idx = positions.findIndex(p => p.symbol === position.symbol && !p.closed);
    if (idx >= 0) {
      positions[idx].stopLoss = newStop;
      await this.savePositions(positions);
    }
    
    return alert;
  }

  // TIME STOP alert
  async alertTimeStop(position) {
    const pnl = (position.currentPrice - position.entryPrice) * position.shares;
    const pnlPct = ((position.currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1);
    
    const alert = {
      type: 'TIME_STOP',
      timestamp: new Date().toISOString(),
      symbol: position.symbol,
      entryTime: position.entryTime,
      exitTime: new Date().toISOString(),
      duration: this.formatDuration(new Date() - new Date(position.entryTime)),
      exitPrice: position.currentPrice,
      pnl: pnl.toFixed(2),
      pnlPct: `${pnlPct}%`,
      reason: 'Time stop triggered',
      message: `⏰ ${position.symbol}: Time stop. Held for ${this.formatDuration(new Date() - new Date(position.entryTime))}. P&L: ${pnl > 0 ? '+' : ''}€${pnl.toFixed(0)} (${pnlPct}%)`
    };

    await this.logAlert(alert);
    await this.sendTelegram(alert);
    await this.closePosition(position, alert);
    
    return alert;
  }

  // FULL EXIT alert
  async alertExit(position, exitPrice, reason) {
    const pnl = (exitPrice - position.entryPrice) * position.shares;
    const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1);
    const totalPartialPnL = position.partialExits?.reduce((a, p) => a + p.pnl, 0) || 0;
    const totalPnL = pnl + totalPartialPnL;
    
    const alert = {
      type: 'EXIT',
      timestamp: new Date().toISOString(),
      symbol: position.symbol,
      entryPrice: position.entryPrice,
      exitPrice,
      pnl: totalPnL.toFixed(2),
      pnlPct: `${pnlPct}%`,
      duration: position.entryTime ? this.formatDuration(new Date() - new Date(position.entryTime)) : 'N/A',
      reason,
      partialExits: position.partialExits?.length || 0,
      message: reason.includes('stop') 
        ? `🛑 ${position.symbol}: Stopped out at $${exitPrice}. Total P&L: ${totalPnL > 0 ? '+' : ''}€${totalPnL.toFixed(0)}`
        : `✅ ${position.symbol}: Exited at $${exitPrice}. Total P&L: ${totalPnL > 0 ? '+' : ''}€${totalPnL.toFixed(0)}`
    };

    await this.logAlert(alert);
    await this.sendTelegram(alert);
    await this.closePosition(position, alert);
    
    return alert;
  }

  // Check for time stops
  async checkTimeStops() {
    const positions = await this.loadPositions();
    const now = new Date();
    
    for (const position of positions) {
      if (position.closed) continue;
      
      const entry = new Date(position.entryTime);
      const daysHeld = (now - entry) / (1000 * 60 * 60 * 24);
      const maxDays = position.tier === 'T1' ? 30 : position.tier === 'T2' ? 180 : 365;
      
      if (daysHeld >= maxDays) {
        await this.alertTimeStop(position);
      }
    }
  }

  // Check for target hits
  async checkTargets(currentPrices) {
    const positions = await this.loadPositions();
    
    for (const position of positions) {
      if (position.closed) continue;
      
      const currentPrice = currentPrices[position.symbol];
      if (!currentPrice) continue;
      
      // Check 25% target
      if (!position.targetsHit?.includes(25) && currentPrice >= position.entryPrice * 1.25) {
        const sharesToSell = Math.floor(position.shares * 0.25);
        await this.alertPartialProfit(position, 25, currentPrice, sharesToSell);
      }
      
      // Check 50% target
      if (!position.targetsHit?.includes(50) && currentPrice >= position.entryPrice * 1.50) {
        const sharesToSell = Math.floor(position.shares * 0.25);
        await this.alertPartialProfit(position, 50, currentPrice, sharesToSell);
      }
      
      // Check 100% target
      if (!position.targetsHit?.includes(100) && currentPrice >= position.entryPrice * 2.00) {
        const sharesToSell = Math.floor(position.shares * 0.25);
        await this.alertPartialProfit(position, 100, currentPrice, sharesToSell);
      }
    }
  }

  async closePosition(position, exitAlert) {
    const positions = await this.loadPositions();
    const idx = positions.findIndex(p => p.symbol === position.symbol && !p.closed);
    if (idx >= 0) {
      positions[idx].closed = true;
      positions[idx].exitAlert = exitAlert;
      await this.savePositions(positions);
    }
  }

  async logAlert(alert) {
    const filename = path.join(this.alertsDir, `${new Date().toISOString().split('T')[0]}_alerts.jsonl`);
    await fs.appendFile(filename, JSON.stringify(alert) + '\n');
  }

  async sendTelegram(alert) {
    // Placeholder — actual send via Telegram bot
    console.log(`\n🚨 ALERT: ${alert.message || alert.type}`);
    console.log(`   ${JSON.stringify(alert, null, 2).slice(0, 200)}...\n`);
  }

  formatDuration(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  }
}

module.exports = EnhancedAlertSystem;

// Demo
if (require.main === module) {
  const alerts = new EnhancedAlertSystem();
  
  // Demo entry
  alerts.alertEntry({
    symbol: 'BTC',
    side: 'LONG',
    size: 5000,
    entryPrice: 63000,
    stopLoss: 60000,
    target: 75000,
    tier: 'T1',
    rationale: 'RSI oversold bounce with volume',
    timeHorizon: 30
  });
}
