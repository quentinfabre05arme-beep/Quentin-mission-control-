/**
 * Financial Tracker
 * Track costs, ROI, and budget for autonomous operations
 */

const fs = require('fs');
const path = require('path');

const COST_FILE = path.join(__dirname, '..', '..', 'logs', 'costs.jsonl');
const REPORT_DIR = path.join(__dirname, '..', '..', 'logs', 'financial');

class FinancialTracker {
  constructor() {
    this.budget = {
      monthly: 100, // €100/month
      daily: 3.33   // €100 / 30 days
    };
    
    this.modelCosts = {
      'ollama-cloud/kimi-k2.6': 0.003,     // €0.003 per 1K tokens
      'ollama-cloud/kimi-k2.7-code': 0.004,
      'ollama-cloud/glm-5.1': 0.002,
      'ollama-cloud/deepseek-v4-pro': 0.003,
      'ollama-cloud/qwen3.6:35b': 0.0015,
      'ollama-cloud/nomic-embed-text': 0.0005,
      'ollama-cloud/qwen3-vl:8b': 0.001,
      'ollama-cloud/qwen3.5:0.8b': 0.0003,
      'ollama-cloud/gemma4:31b': 0.002
    };
    
    this.costs = [];
    this.loadCosts();
  }

  loadCosts() {
    if (fs.existsSync(COST_FILE)) {
      const lines = fs.readFileSync(COST_FILE, 'utf8').trim().split('\n').filter(Boolean);
      this.costs = lines.map(line => JSON.parse(line));
    }
  }

  /**
   * Log a cost for a task
   */
  logCost({ action, tokens, model, value = '' }) {
    const costPer1K = this.modelCosts[model] || 0.003;
    const cost = (tokens / 1000) * costPer1K;
    
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      tokens,
      model,
      cost,
      value,
      date: new Date().toISOString().split('T')[0]
    };
    
    this.costs.push(entry);
    
    // Append to file
    fs.appendFileSync(COST_FILE, JSON.stringify(entry) + '\n');
    
    // Check budget
    this.checkBudget();
    
    return entry;
  }

  /**
   * Get daily cost
   */
  getDailyCost(date = new Date().toISOString().split('T')[0]) {
    return this.costs
      .filter(c => c.date === date)
      .reduce((sum, c) => sum + c.cost, 0);
  }

  /**
   * Get weekly cost
   */
  getWeeklyCost() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return this.costs
      .filter(c => new Date(c.timestamp) >= weekAgo)
      .reduce((sum, c) => sum + c.cost, 0);
  }

  /**
   * Get monthly cost
   */
  getMonthlyCost() {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    return this.costs
      .filter(c => new Date(c.timestamp) >= monthAgo)
      .reduce((sum, c) => sum + c.cost, 0);
  }

  /**
   * Get top expensive tasks
   */
  getTopExpensiveTasks(limit = 10) {
    const taskCosts = {};
    
    for (const cost of this.costs) {
      if (!taskCosts[cost.action]) {
        taskCosts[cost.action] = { action: cost.action, totalCost: 0, count: 0 };
      }
      taskCosts[cost.action].totalCost += cost.cost;
      taskCosts[cost.action].count++;
    }
    
    return Object.values(taskCosts)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  /**
   * Check budget and alert if needed
   */
  checkBudget() {
    const dailyCost = this.getDailyCost();
    const monthlyCost = this.getMonthlyCost();
    
    const alerts = [];
    
    if (dailyCost > this.budget.daily * 1.5) {
      alerts.push({
        level: 'WARNING',
        message: `Daily cost €${dailyCost.toFixed(2)} exceeds 1.5x budget (€${this.budget.daily.toFixed(2)})`
      });
    }
    
    const monthlyPercent = (monthlyCost / this.budget.monthly) * 100;
    
    if (monthlyPercent > 90) {
      alerts.push({
        level: 'CRITICAL',
        message: `Monthly budget 90% used: €${monthlyCost.toFixed(2)} / €${this.budget.monthly}`
      });
    } else if (monthlyPercent > 75) {
      alerts.push({
        level: 'WARNING',
        message: `Monthly budget 75% used: €${monthlyCost.toFixed(2)} / €${this.budget.monthly}`
      });
    } else if (monthlyPercent > 50) {
      alerts.push({
        level: 'INFO',
        message: `Monthly budget 50% used: €${monthlyCost.toFixed(2)} / €${this.budget.monthly}`
      });
    }
    
    return alerts;
  }

  /**
   * Generate weekly report
   */
  generateWeeklyReport() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekCosts = this.costs.filter(c => new Date(c.timestamp) >= weekAgo);
    const totalTokens = weekCosts.reduce((sum, c) => sum + c.tokens, 0);
    const totalCost = weekCosts.reduce((sum, c) => sum + c.cost, 0);
    const avgDaily = totalCost / 7;
    
    const topTasks = this.getTopExpensiveTasks(5);
    
    // Calculate savings
    const manualCost = totalTokens * 0.0001; // Assume manual work costs more
    const savings = manualCost - totalCost;
    
    const report = `💰 Weekly Financial Report
━━━━━━━━━━━━━━━━━━━━━━━━━
Period: ${weekAgo.toDateString()} → ${new Date().toDateString()}

Usage:
- Tokens: ${totalTokens.toLocaleString()} 
- Cost: €${totalCost.toFixed(4)}
- Daily avg: €${avgDaily.toFixed(4)}
- Budget status: ${(totalCost/this.budget.monthly*100).toFixed(1)}% used

Top Expensive Tasks:
${topTasks.map((t, i) => `${i + 1}. ${t.action}: €${t.totalCost.toFixed(4)} (${t.count} runs)`).join('\n')}

Savings Analysis:
- Manual cost estimate: €${manualCost.toFixed(4)}
- Actual cost: €${totalCost.toFixed(4)}
- Savings: €${savings.toFixed(4)} (${(savings/manualCost*100).toFixed(0)}%)

${this.checkBudget().map(a => `⚠️ ${a.message}`).join('\n')}
`;
    
    // Save report
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
    }
    
    const reportFile = path.join(REPORT_DIR, `report_${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(reportFile, report);
    
    return report;
  }

  /**
   * Suggest optimizations
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    const topTasks = this.getTopExpensiveTasks(10);
    
    for (const task of topTasks) {
      const avgTokens = task.totalCost / task.count / 0.003 * 1000;
      
      // Suggest cheaper model for simple tasks
      if (avgTokens < 2000 && task.count > 5) {
        suggestions.push({
          task: task.action,
          suggestion: `Consider qwen3.5:0.8b for this task (€0.0003 vs €0.003 per 1K tokens)`,
          potentialSavings: task.totalCost * 0.9
        });
      }
    }
    
    return suggestions;
  }
}

module.exports = FinancialTracker;
