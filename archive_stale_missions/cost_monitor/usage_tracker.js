// Real-Time API Usage Tracker
// Monitors token usage and costs across all APIs

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'usage_log.json');
const DAILY_BUDGET = 2.67; // $80/month = ~$2.67/day

class UsageTracker {
  constructor() {
    this.usage = this.loadUsage();
    this.models = {
      'ollama-cloud/kimi-k2.6': { costPer1k: 0.008 },
      'ollama-cloud/kimi-k2.7-code': { costPer1k: 0.008 },
      'ollama-cloud/deepseek-v4-pro': { costPer1k: 0.006 },
      'ollama-cloud/glm-5.1': { costPer1k: 0.008 },
      'ollama-cloud/qwen3.6:35b': { costPer1k: 0.003 },
      'ollama-cloud/gemma4:31b': { costPer1k: 0.003 },
      'ollama-cloud/qwen3-vl:8b': { costPer1k: 0.003 },
      'ollama-cloud/nomic-embed-text': { costPer1k: 0.0005 },
      'ollama-cloud/qwen3.5:0.8b': { costPer1k: 0.001 }
    };
  }

  loadUsage() {
    try {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch {
      return {
        totalSpent: 0,
        todaySpent: 0,
        todayDate: new Date().toISOString().split('T')[0],
        byModel: {},
        byHour: {},
        requests: 0
      };
    }
  }

  saveUsage() {
    fs.writeFileSync(LOG_FILE, JSON.stringify(this.usage, null, 2));
  }

  // Track a request
  trackRequest(model, tokensIn, tokensOut) {
    const totalTokens = tokensIn + tokensOut;
    const costPer1k = this.models[model]?.costPer1k || 0.008;
    const cost = (totalTokens / 1000) * costPer1k;
    
    const hour = new Date().getHours();
    const today = new Date().toISOString().split('T')[0];
    
    // Reset daily counter if new day
    if (this.usage.todayDate !== today) {
      this.usage.todaySpent = 0;
      this.usage.todayDate = today;
      this.usage.byHour = {};
    }
    
    // Update stats
    this.usage.totalSpent += cost;
    this.usage.todaySpent += cost;
    this.usage.requests += 1;
    
    // By model
    if (!this.usage.byModel[model]) {
      this.usage.byModel[model] = { tokens: 0, cost: 0, requests: 0 };
    }
    this.usage.byModel[model].tokens += totalTokens;
    this.usage.byModel[model].cost += cost;
    this.usage.byModel[model].requests += 1;
    
    // By hour
    if (!this.usage.byHour[hour]) {
      this.usage.byHour[hour] = { cost: 0, requests: 0 };
    }
    this.usage.byHour[hour].cost += cost;
    this.usage.byHour[hour].requests += 1;
    
    this.saveUsage();
    
    return {
      model,
      tokens: totalTokens,
      cost: cost.toFixed(6),
      todayTotal: this.usage.todaySpent.toFixed(4)
    };
  }

  // Get real-time dashboard
  getDashboard() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    // Reset if new day
    if (this.usage.todayDate !== today) {
      this.usage.todaySpent = 0;
      this.usage.todayDate = today;
    }
    
    const percentUsed = (this.usage.todaySpent / DAILY_BUDGET * 100).toFixed(1);
    const remaining = (DAILY_BUDGET - this.usage.todaySpent).toFixed(4);
    const status = percentUsed > 90 ? '🔴 CRITICAL' : 
                   percentUsed > 75 ? '🟡 WARNING' : 
                   percentUsed > 50 ? '⚠️ ELEVATED' : '✅ HEALTHY';
    
    return {
      timestamp: now.toISOString(),
      status,
      dailyBudget: DAILY_BUDGET,
      todaySpent: this.usage.todaySpent.toFixed(4),
      remaining,
      percentUsed: `${percentUsed}%`,
      totalSpent: this.usage.totalSpent.toFixed(4),
      totalRequests: this.usage.requests,
      byModel: this.usage.byModel,
      currentHour: currentHour,
      hourUsage: this.usage.byHour[currentHour] || { cost: 0, requests: 0 },
      estimatedMonthly: (this.usage.todaySpent * 30).toFixed(2)
    };
  }

  // Simulate tracking (for testing)
  simulateUsage() {
    const models = Object.keys(this.models);
    const randomModel = models[Math.floor(Math.random() * models.length)];
    const randomTokens = Math.floor(Math.random() * 2000) + 100;
    
    return this.trackRequest(randomModel, randomTokens, randomTokens / 2);
  }
}

// CLI
if (require.main === module) {
  const tracker = new UsageTracker();
  const command = process.argv[2];
  
  switch (command) {
    case 'track':
      const model = process.argv[3] || 'ollama-cloud/kimi-k2.6';
      const tokens = parseInt(process.argv[4]) || 1000;
      console.log(JSON.stringify(tracker.trackRequest(model, tokens, tokens/2), null, 2));
      break;
    case 'dashboard':
      console.log(JSON.stringify(tracker.getDashboard(), null, 2));
      break;
    case 'simulate':
      const count = parseInt(process.argv[3]) || 10;
      for (let i = 0; i < count; i++) {
        tracker.simulateUsage();
      }
      console.log(JSON.stringify(tracker.getDashboard(), null, 2));
      break;
    default:
      console.log('Usage: node usage_tracker.js {track|dashboard|simulate}');
      console.log('  track [model] [tokens] - Track a request');
      console.log('  dashboard - Show real-time dashboard');
      console.log('  simulate [count] - Simulate random usage');
  }
}

module.exports = UsageTracker;
