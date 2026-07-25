const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Financial Data Access System
 * Multiple sources with cascading fallbacks
 */

class FinancialDataProvider {
  constructor() {
    this.cacheDir = 'investment_fund/data/cache';
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // Check cache validity
  getCache(symbol) {
    const cacheFile = path.join(this.cacheDir, `${symbol}.json`);
    if (!fs.existsSync(cacheFile)) return null;
    
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const age = Date.now() - new Date(data.timestamp).getTime();
    
    if (age > this.cacheDuration) return null;
    return data;
  }

  // Save to cache
  saveCache(symbol, data) {
    const cacheFile = path.join(this.cacheDir, `${symbol}.json`);
    fs.writeFileSync(cacheFile, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    }, null, 2));
  }

  // Get price from CoinGecko (free, no key needed)
  async getCoinGeckoPrice(symbol) {
    try {
      const idMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana'
      };
      const id = idMap[symbol];
      if (!id) return null;

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data[id]) {
        return {
          price: data[id].usd,
          change_24h: data[id].usd_24h_change,
          source: 'coingecko'
        };
      }
      return null;
    } catch (e) {
      console.error('CoinGecko error:', e.message);
      return null;
    }
  }

  // Get price from Yahoo Finance (stocks)
  async getYahooPrice(symbol) {
    try {
      // Use yfinance via Python or direct API
      // For now, use a simple approach
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.chart?.result?.[0]?.meta) {
        const meta = data.chart.result[0].meta;
        return {
          price: meta.regularMarketPrice,
          change_24h: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          source: 'yahoo'
        };
      }
      return null;
    } catch (e) {
      console.error('Yahoo error:', e.message);
      return null;
    }
  }

  // Get cached market data
  getCachedMarketData() {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../mission_control/market_data.json'), 'utf8'));
      return data;
    } catch (e) {
      return null;
    }
  }

  // Main method: Get accurate price with multiple fallbacks
  async getPrice(symbol) {
    // Check memory cache first
    const cached = this.getCache(symbol);
    if (cached) {
      console.log(`📦 ${symbol}: Using cache (${cached.price})`);
      return cached;
    }

    // Try CoinGecko for crypto
    const cryptoSymbols = ['BTC', 'ETH', 'SOL'];
    if (cryptoSymbols.includes(symbol)) {
      const cg = await this.getCoinGeckoPrice(symbol);
      if (cg) {
        this.saveCache(symbol, cg);
        return cg;
      }
    }

    // Try Yahoo for stocks
    const yahoo = await this.getYahooPrice(symbol);
    if (yahoo) {
      this.saveCache(symbol, yahoo);
      return yahoo;
    }

    // Fallback to cached market data
    const marketData = this.getCachedMarketData();
    if (marketData?.assets?.[symbol]?.price) {
      return {
        price: marketData.assets[symbol].price,
        change_24h: marketData.assets[symbol].change_24h,
        source: 'cached_market_data'
      };
    }

    // Last resort: return null with error
    return {
      error: 'All data sources failed',
      symbol: symbol
    };
  }

  // Batch get multiple prices
  async getPrices(symbols) {
    const results = {};
    for (const symbol of symbols) {
      results[symbol] = await this.getPrice(symbol);
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }
    return results;
  }

  // Get comprehensive portfolio data
  async getPortfolioData() {
    const portfolioPath = path.join(__dirname, '../paper_trading/portfolio.json');
    const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
    const symbols = portfolio.positions.map(p => p.symbol);
    const prices = await this.getPrices(symbols);

    const updatedPositions = portfolio.positions.map(pos => {
      const priceData = prices[pos.symbol];
      if (priceData?.price) {
        const currentValue = pos.quantity * priceData.price;
        const unrealizedPnl = currentValue - (pos.quantity * pos.avg_cost);
        return {
          ...pos,
          current_price: priceData.price,
          current_value: currentValue,
          unrealized_pnl: unrealizedPnl,
          unrealized_pnl_pct: (unrealizedPnl / (pos.quantity * pos.avg_cost)) * 100,
          price_source: priceData.source
        };
      }
      return pos;
    });

    const totalValue = updatedPositions.reduce((sum, pos) => sum + (pos.current_value || pos.current_value), 0);
    const totalPnl = updatedPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);

    return {
      cash: portfolio.cash,
      positions: updatedPositions,
      total_value: totalValue + portfolio.cash,
      total_positions_value: totalValue,
      total_unrealized_pnl: totalPnl,
      last_updated: new Date().toISOString()
    };
  }
}

// CLI usage
if (require.main === module) {
  const provider = new FinancialDataProvider();
  
  (async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💰 FINANCIAL DATA ACCESS SYSTEM');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Test single price
    console.log('Testing single price fetch...');
    const btc = await provider.getPrice('BTC');
    console.log('BTC:', btc);
    
    // Test batch
    console.log('\nTesting batch fetch...');
    const batch = await provider.getPrices(['BTC', 'ETH', 'TSLA', 'NVDA']);
    for (const [sym, data] of Object.entries(batch)) {
      if (data.price) {
        console.log(`${sym}: $${data.price.toLocaleString()} (${data.change_24h?.toFixed(2)}%) [${data.source}]`);
      } else {
        console.log(`${sym}: ERROR - ${data.error}`);
      }
    }
    
    // Test portfolio
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 PORTFOLIO DATA (Live Prices)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const portfolio = await provider.getPortfolioData();
    console.log(`Cash: $${portfolio.cash.toLocaleString()}`);
    console.log(`Total Value: $${portfolio.total_value.toLocaleString()}`);
    console.log(`Unrealized P&L: $${portfolio.total_unrealized_pnl.toFixed(2)}`);
    console.log('\nPositions:');
    portfolio.positions.forEach(pos => {
      console.log(`  ${pos.symbol}: ${pos.quantity} @ $${pos.current_price?.toLocaleString() || 'N/A'} = $${pos.current_value?.toFixed(2) || 'N/A'} (${pos.unrealized_pnl_pct?.toFixed(2) || 'N/A'}%)`);
    });
  })();
}

module.exports = FinancialDataProvider;