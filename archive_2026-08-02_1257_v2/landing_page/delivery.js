const message = require('openclaw').message;
const fs = require('fs');
const path = require('path');

/**
 * Auto-Delivery System for Market Intelligence Reports
 * Sends daily reports to Telegram subscribers
 */

class ReportDelivery {
  constructor() {
    this.channel = '@aimarketintel'; // Replace with actual channel
  }

  async sendDailyReport() {
    const today = new Date().toISOString().slice(0, 10);
    const reportPath = path.join(__dirname, '..', 'investment_fund', 'research', `evening_${today}.md`);
    
    if (!fs.existsSync(reportPath)) {
      console.log('No report found for today');
      return;
    }
    
    const report = fs.readFileSync(reportPath, 'utf8');
    
    // Extract key data
    const summary = this.extractSummary(report);
    
    // Send to Telegram
    await message({
      action: "send",
      target: this.channel,
      message: `📊 Daily Market Report — ${today}\n\n${summary}\n\nFull report: [link]`
    });
    
    console.log(`Report delivered to ${this.channel}`);
  }

  extractSummary(report) {
    // Extract key lines
    const lines = report.split('\n');
    const summary = [];
    
    for (const line of lines) {
      if (line.includes('BTC') || line.includes('ETH') || line.includes('HIMS') || line.includes('MSTR')) {
        summary.push(line.trim());
      }
    }
    
    return summary.slice(0, 5).join('\n');
  }

  async sendAlert(symbol, price, change, signal) {
    const emoji = signal.includes('BUY') ? '🟢' : signal.includes('SELL') ? '🔴' : '⚪';
    
    await message({
      action: "send",
      target: this.channel,
      message: `${emoji} ALERT: ${symbol} at $${price} (${change}%) — ${signal}`
    });
  }
}

module.exports = ReportDelivery;

// Run if called directly
if (require.main === module) {
  const delivery = new ReportDelivery();
  delivery.sendDailyReport().catch(console.error);
}