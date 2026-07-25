/**
 * OpenClaw Revenue API Server
 * REST API for data products and subscription services
 * Version 1.0 | July 25, 2026
 */

const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class RevenueAPIServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3000,
      dataDir: config.dataDir || './data',
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      rateLimitMax: config.rateLimitMax || 100,
      ...config
    };

    this.apiKeys = new Map();
    this.requestLog = [];
    this.server = null;

    this.initialize();
  }

  async initialize() {
    console.log('[API] Initializing Revenue API Server...');
    
    // Load API keys
    await this.loadApiKeys();
    
    // Create server
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    
    console.log('[API] Server initialized');
  }

  async loadApiKeys() {
    try {
      const keysPath = path.join(this.config.dataDir, 'api_keys.json');
      const data = await fs.readFile(keysPath, 'utf8');
      const keys = JSON.parse(data);
      
      for (const key of keys) {
        this.apiKeys.set(key.key, key);
      }
      
      console.log(`[API] Loaded ${this.apiKeys.size} API keys`);
    } catch {
      console.log('[API] No existing API keys found');
      // Create demo key
      this.createApiKey('demo', 'enterprise', { note: 'Demo key for testing' });
    }
  }

  createApiKey(clientId, tier, metadata = {}) {
    const key = crypto.randomBytes(32).toString('hex');
    const apiKey = {
      key,
      client_id: clientId,
      tier,
      created_at: new Date().toISOString(),
      status: 'active',
      usage: {
        total_requests: 0,
        requests_today: 0,
        last_request: null
      },
      metadata
    };

    this.apiKeys.set(key, apiKey);
    this.saveApiKeys();
    
    return apiKey;
  }

  async saveApiKeys() {
    const keysPath = path.join(this.config.dataDir, 'api_keys.json');
    await fs.writeFile(keysPath, JSON.stringify(Array.from(this.apiKeys.values()), null, 2));
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Rate limiting
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey) {
      this.sendError(res, 401, 'API key required');
      return;
    }

    const keyData = this.apiKeys.get(apiKey);
    if (!keyData || keyData.status !== 'active') {
      this.sendError(res, 401, 'Invalid or inactive API key');
      return;
    }

    // Check rate limit
    if (!this.checkRateLimit(keyData)) {
      this.sendError(res, 429, 'Rate limit exceeded');
      return;
    }

    // Log request
    this.logRequest(apiKey, method, path);

    // Route request
    try {
      switch (`${method} ${path}`) {
        case 'GET /health':
          await this.handleHealth(req, res, keyData);
          break;
        case 'GET /market-data':
          await this.handleMarketData(req, res, keyData);
          break;
        case 'GET /technical-analysis':
          await this.handleTechnicalAnalysis(req, res, keyData);
          break;
        case 'GET /sentiment':
          await this.handleSentiment(req, res, keyData);
          break;
        case 'GET /signals':
          await this.handleSignals(req, res, keyData);
          break;
        case 'GET /reports':
          await this.handleReports(req, res, keyData);
          break;
        case 'GET /account':
          await this.handleAccount(req, res, keyData);
          break;
        default:
          this.sendError(res, 404, 'Endpoint not found');
      }
    } catch (error) {
      console.error('[API] Request error:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  checkRateLimit(keyData) {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    // Get requests in current window
    const recentRequests = this.requestLog.filter(
      r => r.key === keyData.key && r.timestamp > windowStart
    );

    // Tier-based limits
    const limits = {
      basic: 100,
      pro: 1000,
      enterprise: 10000
    };

    const limit = limits[keyData.tier] || 100;
    return recentRequests.length < limit;
  }

  logRequest(apiKey, method, path) {
    this.requestLog.push({
      key: apiKey,
      method,
      path,
      timestamp: Date.now()
    });

    // Clean old entries
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.requestLog = this.requestLog.filter(r => r.timestamp > cutoff);
  }

  // Handlers
  async handleHealth(req, res, keyData) {
    this.sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tier: keyData.tier,
      uptime: process.uptime()
    });
  }

  async handleMarketData(req, res, keyData) {
    const parsedUrl = url.parse(req.url, true);
    const symbol = parsedUrl.query.symbol || 'BTC';

    try {
      // Load from market data service or cache
      const marketData = await this.loadMarketData(symbol);
      
      this.sendSuccess(res, {
        symbol,
        timestamp: new Date().toISOString(),
        data: marketData
      });
    } catch (error) {
      this.sendError(res, 500, 'Failed to load market data');
    }
  }

  async handleTechnicalAnalysis(req, res, keyData) {
    const parsedUrl = url.parse(req.url, true);
    const symbol = parsedUrl.query.symbol || 'BTC';

    try {
      const analysis = await this.loadTechnicalAnalysis(symbol);
      
      this.sendSuccess(res, {
        symbol,
        timestamp: new Date().toISOString(),
        analysis
      });
    } catch (error) {
      this.sendError(res, 500, 'Failed to load technical analysis');
    }
  }

  async handleSentiment(req, res, keyData) {
    const parsedUrl = url.parse(req.url, true);
    const symbol = parsedUrl.query.symbol || 'BTC';

    try {
      const sentiment = await this.loadSentiment(symbol);
      
      this.sendSuccess(res, {
        symbol,
        timestamp: new Date().toISOString(),
        sentiment
      });
    } catch (error) {
      this.sendError(res, 500, 'Failed to load sentiment data');
    }
  }

  async handleSignals(req, res, keyData) {
    try {
      const signals = await this.loadSignals();
      
      // Filter by tier
      if (keyData.tier === 'basic') {
        signals.data = signals.data.slice(0, 3); // Limit for basic tier
      }

      this.sendSuccess(res, {
        timestamp: new Date().toISOString(),
        count: signals.data.length,
        signals: signals.data
      });
    } catch (error) {
      this.sendError(res, 500, 'Failed to load signals');
    }
  }

  async handleReports(req, res, keyData) {
    const parsedUrl = url.parse(req.url, true);
    const type = parsedUrl.query.type || 'latest';

    try {
      const reports = await this.loadReports(type, keyData.tier);
      
      this.sendSuccess(res, {
        timestamp: new Date().toISOString(),
        reports
      });
    } catch (error) {
      this.sendError(res, 500, 'Failed to load reports');
    }
  }

  async handleAccount(req, res, keyData) {
    const usage = {
      total_requests: keyData.usage.total_requests,
      requests_today: this.requestLog.filter(
        r => r.key === keyData.key && 
        r.timestamp > Date.now() - 24 * 60 * 60 * 1000
      ).length,
      tier: keyData.tier,
      tier_limits: {
        basic: { requests_per_day: 100 },
        pro: { requests_per_day: 1000 },
        enterprise: { requests_per_day: 10000 }
      }[keyData.tier]
    };

    this.sendSuccess(res, {
      client_id: keyData.client_id,
      tier: keyData.tier,
      status: keyData.status,
      created_at: keyData.created_at,
      usage
    });
  }

  // Data loaders
  async loadMarketData(symbol) {
    try {
      const dataPath = path.join(this.config.dataDir, 'market_data.json');
      const data = await fs.readFile(dataPath, 'utf8');
      const marketData = JSON.parse(data);
      return marketData[symbol] || null;
    } catch {
      return {
        symbol,
        price: null,
        change_24h: null,
        volume: null,
        last_updated: new Date().toISOString(),
        note: 'Data unavailable'
      };
    }
  }

  async loadTechnicalAnalysis(symbol) {
    try {
      const analysisPath = path.join(this.config.dataDir, 'analysis', 'technical', `${symbol}_latest.json`);
      const data = await fs.readFile(analysisPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {
        symbol,
        indicators: {},
        recommendation: 'NEUTRAL',
        note: 'Analysis unavailable'
      };
    }
  }

  async loadSentiment(symbol) {
    try {
      const sentimentPath = path.join(this.config.dataDir, 'analysis', 'sentiment', `${symbol}_latest.json`);
      const data = await fs.readFile(sentimentPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {
        symbol,
        score: 0,
        label: 'neutral',
        note: 'Sentiment data unavailable'
      };
    }
  }

  async loadSignals() {
    try {
      const signalsPath = path.join(this.config.dataDir, 'signals.json');
      const data = await fs.readFile(signalsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return { data: [], note: 'No signals available' };
    }
  }

  async loadReports(type, tier) {
    try {
      const reportsDir = path.join(this.config.dataDir, 'reports', type);
      const files = await fs.readdir(reportsDir);
      
      // Sort by date, newest first
      files.sort().reverse();
      
      // Limit based on tier
      const limit = tier === 'enterprise' ? 10 : tier === 'pro' ? 5 : 1;
      const recentFiles = files.slice(0, limit);
      
      const reports = [];
      for (const file of recentFiles) {
        const data = await fs.readFile(path.join(reportsDir, file), 'utf8');
        reports.push(JSON.parse(data));
      }
      
      return reports;
    } catch {
      return [];
    }
  }

  // Response helpers
  sendSuccess(res, data) {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      ...data
    }));
  }

  sendError(res, status, message) {
    res.writeHead(status);
    res.end(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }));
  }

  // Server control
  start() {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`[API] Server running on port ${this.config.port}`);
        console.log(`[API] Available endpoints:`);
        console.log(`  GET /health`);
        console.log(`  GET /market-data?symbol=BTC`);
        console.log(`  GET /technical-analysis?symbol=BTC`);
        console.log(`  GET /sentiment?symbol=BTC`);
        console.log(`  GET /signals`);
        console.log(`  GET /reports`);
        console.log(`  GET /account`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[API] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = RevenueAPIServer;

// Run if executed directly
if (require.main === module) {
  const server = new RevenueAPIServer({
    port: process.env.PORT || 3000,
    dataDir: './mission_control/monetization/data'
  });

  server.start().catch(console.error);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[API] Shutting down...');
    await server.stop();
    process.exit(0);
  });
}
