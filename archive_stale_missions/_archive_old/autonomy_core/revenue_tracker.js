/**
 * Revenue Tracker v2.0
 * Tracks all revenue streams, costs, and profitability
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const REVENUE_FILE = path.join(DATA_DIR, 'revenue.json');
const COSTS_FILE = path.join(DATA_DIR, 'costs.json');

class RevenueTracker {
  constructor() {
    this.ensureDirectories();
    this.data = this.loadData();
  }

  ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    const defaultData = {
      revenue_streams: {
        investments: {
          crypto_trading: { daily: [], monthly: [], total: 0 },
          stock_trading: { daily: [], monthly: [], total: 0 },
          dividends: { daily: [], monthly: [], total: 0 }
        },
        business: {
          consulting: { daily: [], monthly: [], total: 0 },
          products: { daily: [], monthly: [], total: 0 },
          services: { daily: [], monthly: [], total: 0 }
        },
        passive: {
          ads: { daily: [], monthly: [], total: 0 },
          affiliates: { daily: [], monthly: [], total: 0 },
          subscriptions: { daily: [], monthly: [], total: 0 }
        }
      },
      costs: {
        infrastructure: { servers: 0, apis: 0, tools: 0 },
        operations: { software: 0, services: 0 },
        marketing: { ads: 0, content: 0 }
      },
      daily_summary: [],
      last_updated: new Date().toISOString()
    };

    try {
      if (fs.existsSync(REVENUE_FILE)) {
        return JSON.parse(fs.readFileSync(REVENUE_FILE, 'utf8'));
      }
    } catch (e) {
      console.log('Creating new revenue data file');
    }

    fs.writeFileSync(REVENUE_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }

  saveData() {
    this.data.last_updated = new Date().toISOString();
    fs.writeFileSync(REVENUE_FILE, JSON.stringify(this.data, null, 2));
  }

  /**
   * Record revenue from any source
   */
  recordRevenue(category, subcategory, amount, metadata = {}) {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    
    if (!this.data.revenue_streams[category]) {
      this.data.revenue_streams[category] = {};
    }
    
    if (!this.data.revenue_streams[category][subcategory]) {
      this.data.revenue_streams[category][subcategory] = {
        daily: [], monthly: [], total: 0
      };
    }

    const entry = {
      amount,
      timestamp,
      date,
      ...metadata
    };

    this.data.revenue_streams[category][subcategory].daily.push(entry);
    this.data.revenue_streams[category][subcategory].total += amount;

    // Update monthly aggregation
    const month = date.substring(0, 7); // YYYY-MM
    const monthEntry = this.data.revenue_streams[category][subcategory].monthly
      .find(m => m.month === month);
    
    if (monthEntry) {
      monthEntry.amount += amount;
      monthEntry.transactions++;
    } else {
      this.data.revenue_streams[category][subcategory].monthly.push({
        month,
        amount,
        transactions: 1
      });
    }

    this.saveData();
    this.logToMemory('Revenue', category, subcategory, amount, metadata);
    
    return entry;
  }

  /**
   * Record a cost/expense
   */
  recordCost(category, item, amount, metadata = {}) {
    if (!this.data.costs[category]) {
      this.data.costs[category] = {};
    }
    
    if (!this.data.costs[category][item]) {
      this.data.costs[category][item] = { total: 0, entries: [] };
    }

    const entry = {
      amount,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.data.costs[category][item].entries.push(entry);
    this.data.costs[category][item].total += amount;
    
    this.saveData();
    this.logToMemory('Cost', category, item, amount, metadata);
    
    return entry;
  }

  /**
   * Get daily summary
   */
  getDailySummary(date = new Date().toISOString().split('T')[0]) {
    let totalRevenue = 0;
    let totalCost = 0;
    
    // Calculate revenue for date
    Object.values(this.data.revenue_streams || {}).forEach(category => {
      Object.values(category || {}).forEach(sub => {
        if (sub && sub.daily) {
          sub.daily.forEach(entry => {
            if (entry.date === date) totalRevenue += entry.amount;
          });
        }
      });
    });

    // Calculate costs for date
    Object.values(this.data.costs || {}).forEach(category => {
      Object.values(category || {}).forEach(item => {
        if (item && item.entries) {
          item.entries.forEach(entry => {
            if (entry.timestamp?.startsWith(date)) totalCost += entry.amount;
          });
        }
      });
    });

    return {
      date,
      revenue: totalRevenue,
      costs: totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(2) : 0
    };
  }

  /**
   * Get monthly report
   */
  getMonthlyReport(month = new Date().toISOString().substring(0, 7)) {
    const report = {
      month,
      revenue: {},
      costs: {},
      totals: { revenue: 0, costs: 0, profit: 0 }
    };

    // Aggregate revenue by category
    Object.entries(this.data.revenue_streams || {}).forEach(([cat, subs]) => {
      report.revenue[cat] = 0;
      Object.values(subs || {}).forEach(sub => {
        if (sub && sub.monthly) {
          const monthData = sub.monthly.find(m => m.month === month);
          if (monthData) {
            report.revenue[cat] += monthData.amount;
            report.totals.revenue += monthData.amount;
          }
        }
      });
    });

    // Aggregate costs
    Object.entries(this.data.costs || {}).forEach(([cat, items]) => {
      report.costs[cat] = 0;
      Object.values(items || {}).forEach(item => {
        if (item && item.entries) {
          item.entries.forEach(entry => {
            if (entry.timestamp?.substring(0, 7) === month) {
              report.costs[cat] += entry.amount;
              report.totals.costs += entry.amount;
            }
          });
        }
      });
    });

    report.totals.profit = report.totals.revenue - report.totals.costs;
    report.totals.margin = report.totals.revenue > 0 
      ? ((report.totals.profit / report.totals.revenue) * 100).toFixed(2)
      : 0;

    return report;
  }

  /**
   * Get all revenue streams status
   */
  getRevenueStreams() {
    const streams = [];
    
    Object.entries(this.data.revenue_streams || {}).forEach(([category, subs]) => {
      Object.entries(subs || {}).forEach(([sub, data]) => {
        if (!data || !data.daily) return;
        const today = new Date().toISOString().split('T')[0];
        const todayRevenue = data.daily
          .filter(e => e.date === today)
          .reduce((a, b) => a + b.amount, 0);
        
        streams.push({
          category,
          subcategory: sub,
          total: data.total,
          today: todayRevenue,
          transactions: data.daily.length,
          status: todayRevenue > 0 ? 'active' : 'idle'
        });
      });
    });

    return streams;
  }

  /**
   * Log to MEMORY.md
   */
  logToMemory(type, category, item, amount, metadata) {
    const MEMORY_FILE = path.join(process.cwd(), 'MEMORY.md');
    const entry = `
## Revenue Tracker - ${type}
**Date:** ${new Date().toISOString()}
**Category:** ${category}
**Item:** ${item}
**Amount:** $${amount.toFixed(2)}
**Metadata:** ${JSON.stringify(metadata)}

---
`;

    try {
      if (fs.existsSync(MEMORY_FILE)) {
        fs.appendFileSync(MEMORY_FILE, entry);
      }
    } catch (e) {
      // Silent fail for MEMORY.md
    }
  }

  /**
   * Generate full report
   */
  generateReport() {
    const today = this.getDailySummary();
    const month = this.getMonthlyReport();
    const streams = this.getRevenueStreams();
    
    return {
      generated_at: new Date().toISOString(),
      daily: today,
      monthly: month,
      streams,
      health: {
        profitable: month.totals.profit > 0,
        margin_healthy: parseFloat(month.totals.margin) > 20,
        active_streams: streams.filter(s => s.status === 'active').length,
        total_streams: streams.length
      }
    };
  }
}

module.exports = RevenueTracker;

// CLI usage
if (require.main === module) {
  const tracker = new RevenueTracker();
  
  // Example: Record some revenue
  tracker.recordRevenue('investments', 'crypto_trading', 150.50, {
    asset: 'BTC',
    strategy: 'swing_trade'
  });
  
  tracker.recordCost('infrastructure', 'apis', 25.00, {
    service: 'serper.dev'
  });
  
  console.log('Daily Summary:', tracker.getDailySummary());
  console.log('Monthly Report:', tracker.getMonthlyReport());
  console.log('Full Report:', JSON.stringify(tracker.generateReport(), null, 2));
}
