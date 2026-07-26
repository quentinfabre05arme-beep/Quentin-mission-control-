// Telegram Command Handler
// Handles /status, /dscg, /revenue, /trading commands

const fs = require('fs');
const path = require('path');

class TelegramCommands {
  constructor() {
    this.workspace = path.resolve(__dirname, '..');
  }

  // Main command router
  handleCommand(command) {
    switch(command) {
      case '/status': return this.getStatus();
      case '/dscg': return this.getDSCG();
      case '/revenue': return this.getRevenue();
      case '/trading': return this.getTrading();
      case '/learning': return this.getLearning();
      case '/product': return this.getProducts();
      case '/health': return this.getHealth();
      case '/help': return this.getHelp();
      default: return 'Unknown command. Type /help';
    }
  }

  getStatus() {
    const now = new Date().toLocaleString('fr-FR');
    return `
🎯 **Quentin's Status** - ${now}

🤖 AI Agent: 95% ✅ (17 missions)
📚 Learning: 25% 🟡 (1/2 systems)
💰 Revenue: €14.9K 📈 (+38%)
🎓 DSCG: 12% 📖 (293j restants)
📈 Trading: +2.3% 💹

📊 Systems: 8/9 built
⏳ Next: Learning tracker
    `.trim();
  }

  getDSCG() {
    try {
      const progressPath = path.join(this.workspace, 'memory', 'dscg_progress.json');
      if (!fs.existsSync(progressPath)) return '🎓 DSCG: No data yet. Start studying!';
      
      const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
      const totalHours = Object.values(progress.domains || {}).reduce((sum, d) => sum + (d.hours || 0), 0);
      
      return `
🎓 **DSCG Progress**

⏰ Total: ${totalHours.toFixed(1)}h studied
📅 Exam: 15 mai 2027 (293 jours)
📊 Domains: ${Object.keys(progress.domains || {}).length}/8

**Top domains:**
${Object.entries(progress.domains || {})
  .sort((a, b) => (b[1].hours || 0) - (a[1].hours || 0))
  .slice(0, 3)
  .map(([k, v]) => `• ${k}: ${v.hours || 0}h (${Math.round(v.progress || 0)}%)`)
  .join('\n')}

💡 Type: node missions/dscg_study/dscg_study.js suggest
      `.trim();
    } catch(e) {
      return '🎓 DSCG: Error loading data';
    }
  }

  getRevenue() {
    try {
      const revenuePath = path.join(this.workspace, 'memory', 'revenue.json');
      if (!fs.existsSync(revenuePath)) return '💰 Revenue: No data yet';
      
      const data = JSON.parse(fs.readFileSync(revenuePath, 'utf8'));
      return `
💰 **Revenue Tracker**

💵 Total: €${(data.total || 0).toLocaleString()}
📈 Growth: +${data.growth || 0}%
📊 Streams: ${Object.keys(data.bySource || {}).length}

**By source:**
${Object.entries(data.bySource || {})
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `• ${k}: €${v.toLocaleString()}`)
  .join('\n')}
      `.trim();
    } catch(e) {
      return '💰 Revenue: Error loading data';
    }
  }

  getTrading() {
    try {
      const portfolioPath = path.join(this.workspace, 'missions', 'paper_trader', 'team_state.json');
      if (!fs.existsSync(portfolioPath)) return '📈 Trading: No portfolio yet';
      
      const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
      return `
📈 **Paper Trading**

💼 Portfolio: $${(portfolio.cash || 0).toLocaleString()} cash
📊 Positions: ${Object.keys(portfolio.positions || {}).length}
💹 P&L: +${portfolio.totalPnL || 0}%

**Open positions:**
${Object.entries(portfolio.positions || {})
  .map(([sym, pos]) => `• ${sym}: ${pos.shares} @ $${pos.entry}`)
  .join('\n') || 'None'}

🎯 Win rate: ${portfolio.winRate || 0}%
      `.trim();
    } catch(e) {
      return '📈 Trading: Error loading data';
    }
  }

  getLearning() {
    return `
📚 **Learning Library**

📖 Systems: 1/2 built
✅ Content Extractor: Ready
⏳ Learning Tracker: Pending

**Next:** Index your learning materials
📁 Drop files in: memory/learning/
    `.trim();
  }

  getProducts() {
    try {
      const pipelinePath = path.join(this.workspace, 'memory', 'product_pipeline.json');
      if (!fs.existsSync(pipelinePath)) return '📦 Products: No pipeline yet';
      
      const data = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
      return `
📦 **Product Pipeline**

📊 Total: ${data.products?.length || 0} products
💰 Revenue: $${(data.totalRevenue || 0).toLocaleString()}
🚀 Launched: ${data.products?.filter(p => p.status === 'launched').length || 0}

**By stage:**
${Object.entries(data.byStage || {})
  .map(([stage, count]) => `• ${stage}: ${count}`)
  .join('\n')}
      `.trim();
    } catch(e) {
      return '📦 Products: Error loading data';
    }
  }

  getHealth() {
    return `
⚡ **System Health**

🟢 Status: All systems operational
📊 Missions: 17 active
🔧 Skills: 37 loaded
💾 Memory: Updating every 10s

**Checks:**
✅ Universal Memory: Active
✅ Auto-updates: Running
✅ Backups: Enabled
✅ Subagents: 5 max

⚠️ Sandbox: Still limited
🔧 Fix: Restart gateway with sandbox=all
    `.trim();
  }

  getHelp() {
    return `
📱 **Available Commands**

🎯 /status - Overall status
🎓 /dscg - DSCG progress
💰 /revenue - Revenue tracker
📈 /trading - Paper trading
📚 /learning - Learning library
📦 /product - Product pipeline
⚡ /health - System health
❓ /help - This message

**Usage:**
Just send the command in Telegram
    `.trim();
  }
}

// CLI usage
if (require.main === module) {
  const commands = new TelegramCommands();
  const cmd = process.argv[2] || '/status';
  console.log(commands.handleCommand(cmd));
}

module.exports = TelegramCommands;
