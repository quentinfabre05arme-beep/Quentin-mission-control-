// Content Agent - Generate posts, schedule content, engagement
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = 'C:\\Users\\quent\\.openclaw\\workspace\\content';
const LOG_FILE = path.join(__dirname, 'content_agent.log');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

class ContentAgent {
  async run() {
    const results = {
      timestamp: new Date().toISOString(),
      posts: [],
      scheduled: [],
      errors: []
    };

    // 1. Generate content ideas
    try {
      log('Generating content...');
      const ideas = await this.generateIdeas();
      results.posts = ideas;
    } catch (e) {
      results.errors.push({ type: 'generation', error: e.message });
    }

    // 2. Save draft posts
    try {
      this.saveDrafts(results.posts);
    } catch (e) {
      results.errors.push({ type: 'save', error: e.message });
    }

    log(`Content complete: ${results.posts.length} posts generated`);
    return results;
  }

  async generateIdeas() {
    const templates = [
      {
        type: 'market_update',
        topic: 'crypto',
        template: '📊 Market Update\n\n{asset}: ${price} ({change}%)\nSignal: {signal}\n\n#crypto #trading'
      },
      {
        type: 'insight',
        topic: 'analysis', 
        template: '💡 Key Insight\n\n{insight}\n\nWhat do you think?\n\n#analysis #markets'
      },
      {
        type: 'milestone',
        topic: 'achievement',
        template: '🎯 Milestone Reached\n\n{milestone}\n\nOnward! 🚀\n\n#progress'
      }
    ];

    // Try to get current market data for context
    let marketContext = {};
    try {
      const marketData = require('../../mission_control/market_data.json');
      marketContext = marketData.assets || {};
    } catch (e) {
      // Use placeholder
      marketContext = {
        BTC: { price: 64474, change_24h: 0.15 },
        ETH: { price: 1886, change_24h: 0.62 }
      };
    }

    const posts = [];
    
    // Generate market update
    if (marketContext.BTC) {
      posts.push({
        type: 'market_update',
        content: `📊 Market Update\n\nBTC: $${marketContext.BTC.price} (${marketContext.BTC.change_24h > 0 ? '+' : ''}${marketContext.BTC.change_24h.toFixed(2)}%)\nETH: $${marketContext.ETH?.price || 'N/A'} (${marketContext.ETH?.change_24h > 0 ? '+' : ''}${marketContext.ETH?.change_24h?.toFixed(2) || 'N/A'}%)\n\n#crypto #trading`,
        platform: 'twitter',
        scheduled: false
      });
    }

    // Generate insight
    posts.push({
      type: 'insight',
      content: `💡 Key Insight\n\nMarkets showing mixed signals today. Key levels to watch:\n• BTC support at $64K\n• ETH resistance at $1,900\n\nWhat do you think?\n\n#analysis #markets`,
      platform: 'twitter',
      scheduled: false
    });

    return posts;
  }

  saveDrafts(posts) {
    if (!fs.existsSync(CONTENT_DIR)) {
      fs.mkdirSync(CONTENT_DIR, { recursive: true });
    }

    const draftsFile = path.join(CONTENT_DIR, `drafts_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(draftsFile, JSON.stringify(posts, null, 2));
    
    log(`Saved ${posts.length} drafts to ${draftsFile}`);
  }
}

module.exports = new ContentAgent();
