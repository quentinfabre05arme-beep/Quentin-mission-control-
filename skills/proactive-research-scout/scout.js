/**
 * Proactive Research Scout
 * Monitor and surface insights before user asks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALERTS_FILE = path.join(__dirname, '..', '..', 'logs', 'research_alerts.jsonl');
const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

class ProactiveResearchScout {
  constructor() {
    this.assets = ['BTC', 'ETH', 'MSTR', 'HIMS', 'AAPL', 'COIN'];
    this.topics = ['AI', 'crypto regulation', 'biotech', 'telehealth', 'market macro'];
    this.thresholds = {
      priceMove: 5, // %
      sentimentShift: 20, // %
      newsVolume: 10 // articles
    };
  }

  async scanAll() {
    const alerts = [];
    
    // Check portfolio assets
    for (const asset of this.assets) {
      const alert = await this.checkAsset(asset);
      if (alert) alerts.push(alert);
    }
    
    // Check trending topics
    for (const topic of this.topics) {
      const alert = await this.checkTopic(topic);
      if (alert) alerts.push(alert);
    }
    
    // Log alerts
    if (alerts.length > 0) {
      this.logAlerts(alerts);
    }
    
    return alerts;
  }

  async checkAsset(asset) {
    try {
      // Get current price data
      const marketData = await this.getMarketData(asset);
      if (!marketData) return null;
      
      const { price, change24h, previousPrice } = marketData;
      
      // Check for significant price move
      if (Math.abs(change24h) > this.thresholds.priceMove) {
        return {
          type: 'price_move',
          asset,
          price,
          change: change24h,
          direction: change24h > 0 ? 'up' : 'down',
          severity: Math.abs(change24h) > 10 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        };
      }
      
      // Check for technical breakout (simplified)
      const technical = await this.getTechnicalData(asset);
      if (technical && technical.breakout) {
        return {
          type: 'technical_breakout',
          asset,
          price,
          pattern: technical.pattern,
          severity: 'medium',
          timestamp: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error checking ${asset}:`, error.message);
      return null;
    }
  }

  async checkTopic(topic) {
    try {
      // Check news volume
      const newsCount = await this.getNewsCount(topic);
      if (newsCount > this.thresholds.newsVolume) {
        return {
          type: 'news_volume',
          topic,
          articles: newsCount,
          severity: newsCount > 20 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        };
      }
      
      // Check sentiment shift
      const sentiment = await this.getSentiment(topic);
      if (sentiment && Math.abs(sentiment.change) > this.thresholds.sentimentShift) {
        return {
          type: 'sentiment_shift',
          topic,
          sentiment: sentiment.current,
          change: sentiment.change,
          severity: 'medium',
          timestamp: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error checking ${topic}:`, error.message);
      return null;
    }
  }

  async getMarketData(asset) {
    try {
      // Try to read from cached market data
      const cacheFile = path.join(CACHE_DIR, `${asset}_market.json`);
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return {
          price: data.price,
          change24h: data.change24h,
          previousPrice: data.previousPrice
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getTechnicalData(asset) {
    // Placeholder for technical analysis
    return null;
  }

  async getNewsCount(topic) {
    // Placeholder for news counting
    // Would integrate with Serper or similar
    return 0;
  }

  async getSentiment(topic) {
    // Placeholder for sentiment analysis
    return null;
  }

  logAlerts(alerts) {
    for (const alert of alerts) {
      fs.appendFileSync(ALERTS_FILE, JSON.stringify(alert) + '\n');
    }
  }

  /**
   * Pre-research when user mentions topic
   */
  async preResearch(topic) {
    const cacheFile = path.join(CACHE_DIR, `${topic.toLowerCase().replace(/\s+/g, '_')}_research.json`);
    
    // Check if data is fresh (< 1 hour)
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
      
      if (ageMinutes < 60) {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    }
    
    // Fetch fresh data
    const data = await this.fetchResearchData(topic);
    
    // Cache it
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    
    return data;
  }

  async fetchResearchData(topic) {
    // This would integrate with research APIs
    // Placeholder implementation
    return {
      topic,
      timestamp: new Date().toISOString(),
      summary: `Research data for ${topic}`,
      sources: [],
      keyPoints: []
    };
  }
}

module.exports = ProactiveResearchScout;
