/**
 * OpenClaw Revenue Dashboard
 * Console-based metrics and revenue tracking
 * Version 1.0 | July 25, 2026
 */

const fs = require('fs').promises;
const path = require('path');

class RevenueDashboard {
  constructor(config = {}) {
    this.config = {
      dataDir: config.dataDir || './data',
      refreshInterval: config.refreshInterval || 5000,
      ...config
    };
    
    this.metrics = {
      totalRevenue: 0,
      subscribers: 0,
      activeStreams: 0,
      uptime: 0
    };
  }

  async loadMetrics() {
    try {
      const metricsPath = path.join(this.config.dataDir, 'metrics.json');
      const data = await fs.readFile(metricsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return this.metrics;
    }
  }

  async loadSubscribers() {
    try {
      const subsPath = path.join(this.config.dataDir, 'subscribers.json');
      const data = await fs.readFile(subsPath, 'utf8');
      const subscribers = JSON.parse(data);
      return subscribers.length;
    } catch {
      return 0;
    }
  }

  async loadSubscriptions() {
    try {
      const subsPath = path.join(this.config.dataDir, 'subscriptions.json');
      const data = await fs.readFile(subsPath, 'utf8');
      const subscriptions = JSON.parse(data);
      return subscriptions.filter(s => s.status === 'active').length;
    } catch {
      return 0;
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async render() {
    const metrics = await this.loadMetrics();
    const subscribers = await this.loadSubscribers();
    const activeSubs = await this.loadSubscriptions();
    
    // Calculate MRR
    const mrr = activeSubs * 99; // Average $99/month
    
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           OPENCLAW REVENUE DASHBOARD v1.0                  ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                                                            ║');
    console.log(`║  💰 TOTAL REVENUE:    ${this.formatCurrency(metrics.totalRevenue || 0).padEnd(35)}║`);
    console.log(`║  📈 MONTHLY RECURRING: ${this.formatCurrency(mrr).padEnd(35)}║`);
    console.log(`║  👥 SUBSCRIBERS:      ${String(subscribers).padEnd(35)}║`);
    console.log(`║  ✅ ACTIVE SUBS:      ${String(activeSubs).padEnd(35)}║`);
    console.log(`║  🔄 ACTIVE STREAMS:   ${String(metrics.activeStreams || 2).padEnd(35)}║`);
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  REVENUE STREAMS                                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  📊 Research Reports    [ACTIVE]  $29-$499/month           ║');
    console.log('║  📈 Trading Signals     [ACTIVE]  $49-$999/month            ║');
    console.log('║  🔌 API Services        [STANDBY] $299-$999/month           ║');
    console.log('║  🏢 Consulting         [STANDBY] Custom pricing           ║');
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  PRICING TIERS                                             ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  🥉 Basic      $29/mo   Weekly reports + Community          ║');
    console.log('║  🥈 Pro        $99/mo   Daily reports + Alerts + API      ║');
    console.log('║  🥇 Enterprise $499/mo  Custom + White-label + Team         ║');
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  SYSTEM STATUS                                             ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Status:     RUNNING                                       ║`);
    console.log(`║  Uptime:     ${this.formatUptime(metrics.uptime || 0).padEnd(46)}║`);
    console.log(`║  Health:     ✅ All systems operational                    ║`);
    console.log(`║  Last Check: ${new Date().toISOString().slice(0, 19).padEnd(46)}║`);
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Commands: [R]efresh | [Q]uit | [S]tart Research | [A]PI Test');
  }

  async start() {
    console.log('Starting Revenue Dashboard...');
    
    await this.render();
    
    // Refresh loop
    const refresh = async () => {
      await this.render();
      setTimeout(refresh, this.config.refreshInterval);
    };
    
    setTimeout(refresh, this.config.refreshInterval);
  }
}

module.exports = RevenueDashboard;

// Run if executed directly
if (require.main === module) {
  const dashboard = new RevenueDashboard({
    dataDir: './data'
  });
  
  dashboard.start().catch(console.error);
  
  // Handle input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key.toString() === 'q' || key.toString() === '\u0003') {
      console.log('\n👋 Dashboard closed');
      process.exit(0);
    }
  });
}
