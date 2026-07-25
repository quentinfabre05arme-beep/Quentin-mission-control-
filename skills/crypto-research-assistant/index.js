const fetch = require('node-fetch');

/**
 * Crypto Research Assistant
 * Version: 1.0
 * Automated crypto market research and signal generation
 */

class CryptoResearchAssistant {
  constructor(config = {}) {
    this.config = {
      assets: config.assets || ['BTC', 'ETH', 'SOL'],
      indicators: config.indicators || ['rsi', 'macd', 'sma'],
      dataSources: config.dataSources || { primary: 'coingecko' },
      alerts: config.alerts || {}
    };
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  // Fetch price data from CoinGecko
  async getPriceData(asset) {
    const cacheKey = `price_${asset}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.data;
      }
    }

    try {
      const idMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network'
      };

      const id = idMap[asset] || asset.toLowerCase();
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data[id]) {
        const result = {
          price: data[id].usd,
          change24h: data[id].usd_24h_change,
          marketCap: data[id].usd_market_cap,
          volume24h: data[id].usd_24h_vol,
          timestamp: new Date().toISOString()
        };

        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching price for ${asset}:`, error.message);
      return null;
    }
  }

  // Calculate RSI
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  // Calculate MACD
  calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (prices.length < slow + signal) return null;

    const ema = (data, period) => {
      const k = 2 / (period + 1);
      let ema = data[0];
      for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
      }
      return ema;
    };

    const fastEMA = ema(prices.slice(-slow), fast);
    const slowEMA = ema(prices.slice(-slow), slow);
    const macd = fastEMA - slowEMA;

    return {
      macd,
      signal: macd * 0.9, // Simplified signal
      histogram: macd - (macd * 0.9)
    };
  }

  // Calculate SMA
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // Generate technical indicators
  async getTechnicalAnalysis(asset) {
    // Get historical prices (simplified - would need actual API)
    const prices = await this.getHistoricalPrices(asset, 30);
    
    if (!prices || prices.length < 20) {
      return null;
    }

    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);

    return {
      asset,
      rsi: rsi ? rsi.toFixed(2) : null,
      macd: macd ? {
        macd: macd.macd.toFixed(2),
        signal: macd.signal.toFixed(2),
        histogram: macd.histogram.toFixed(2)
      } : null,
      sma20: sma20 ? sma20.toFixed(2) : null,
      sma50: sma50 ? sma50.toFixed(2) : null,
      trend: sma20 > sma50 ? 'bullish' : 'bearish'
    };
  }

  // Get historical prices (placeholder - would need actual implementation)
  async getHistoricalPrices(asset, days) {
    // This would fetch from an API like CoinGecko or Twelve Data
    // For now, return mock data for demonstration
    const basePrice = {
      'BTC': 65000,
      'ETH': 3500,
      'SOL': 150,
      'AVAX': 40,
      'MATIC': 1.2
    };

    const prices = [];
    const base = basePrice[asset] || 100;
    
    for (let i = 0; i < days; i++) {
      prices.push(base * (1 + (Math.random() - 0.5) * 0.05));
    }

    return prices;
  }

  // Generate trading signal
  async getSignal(asset) {
    const priceData = await this.getPriceData(asset);
    const technical = await this.getTechnicalAnalysis(asset);

    if (!priceData || !technical) {
      return { asset, signal: 'neutral', confidence: 0 };
    }

    let score = 0;
    let factors = [];

    // RSI analysis
    if (technical.rsi < 30) {
      score += 2;
      factors.push('RSI oversold');
    } else if (technical.rsi > 70) {
      score -= 2;
      factors.push('RSI overbought');
    }

    // Trend analysis
    if (technical.trend === 'bullish') {
      score += 1;
      factors.push('Bullish trend');
    } else {
      score -= 1;
      factors.push('Bearish trend');
    }

    // MACD analysis
    if (technical.macd && technical.macd.histogram > 0) {
      score += 1;
      factors.push('MACD positive');
    } else if (technical.macd) {
      score -= 1;
      factors.push('MACD negative');
    }

    // Price momentum
    if (priceData.change24h > 5) {
      score += 1;
      factors.push('Strong 24h momentum');
    } else if (priceData.change24h < -5) {
      score -= 1;
      factors.push('Weak 24h momentum');
    }

    // Determine signal
    let signal, confidence;
    if (score >= 3) {
      signal = 'strong_buy';
      confidence = Math.min(95, 70 + score * 5);
    } else if (score >= 1) {
      signal = 'buy';
      confidence = Math.min(85, 60 + score * 5);
    } else if (score <= -3) {
      signal = 'strong_sell';
      confidence = Math.min(95, 70 + Math.abs(score) * 5);
    } else if (score <= -1) {
      signal = 'sell';
      confidence = Math.min(85, 60 + Math.abs(score) * 5);
    } else {
      signal = 'hold';
      confidence = 50;
    }

    return {
      asset,
      price: priceData.price,
      change24h: priceData.change24h,
      signal,
      score,
      confidence,
      factors,
      technical,
      timestamp: new Date().toISOString()
    };
  }

  // Generate comprehensive research report
  async generateReport(options = {}) {
    const assets = options.assets || this.config.assets;
    const results = [];

    for (const asset of assets) {
      const priceData = await this.getPriceData(asset);
      const signal = await this.getSignal(asset);
      
      if (priceData) {
        results.push({
          asset,
          price: priceData.price,
          change24h: priceData.change24h,
          marketCap: priceData.marketCap,
          volume24h: priceData.volume24h,
          signal: signal.signal,
          confidence: signal.confidence,
          factors: signal.factors,
          technical: signal.technical
        });
      }
    }

    // Generate summary
    const bullish = results.filter(r => r.signal.includes('buy')).length;
    const bearish = results.filter(r => r.signal.includes('sell')).length;
    const neutral = results.filter(r => r.signal === 'hold').length;

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalAssets: results.length,
        bullish,
        bearish,
        neutral,
        topPick: results.reduce((best, current) => 
          current.confidence > best.confidence ? current : best, results[0])
      },
      assets: results
    };
  }

  // Get signals for multiple assets
  async getSignals(options = {}) {
    const assets = options.assets || this.config.assets;
    const signals = [];

    for (const asset of assets) {
      const signal = await this.getSignal(asset);
      signals.push(signal);
    }

    return signals;
  }

  // Monitor portfolio
  async monitorPortfolio(positions) {
    const results = [];
    let totalValue = 0;
    let totalCost = 0;

    for (const position of positions) {
      const priceData = await this.getPriceData(position.asset);
      
      if (priceData) {
        const currentValue = position.quantity * priceData.price;
        const costBasis = position.quantity * position.avgCost;
        const pnl = currentValue - costBasis;
        const pnlPercent = (pnl / costBasis) * 100;

        totalValue += currentValue;
        totalCost += costBasis;

        results.push({
          asset: position.asset,
          quantity: position.quantity,
          avgCost: position.avgCost,
          currentPrice: priceData.price,
          currentValue,
          pnl,
          pnlPercent,
          allocation: 0 // Will calculate after
        });
      }
    }

    // Calculate allocations
    for (const result of results) {
      result.allocation = (result.currentValue / totalValue) * 100;
    }

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = (totalPnl / totalCost) * 100;

    return {
      timestamp: new Date().toISOString(),
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      positions: results
    };
  }

  // Set alert
  setAlert(options) {
    // This would integrate with cron system
    console.log(`Alert set for ${options.asset}: ${options.condition} ${options.value}`);
    return {
      id: `alert_${Date.now()}`,
      ...options,
      active: true
    };
  }
}

module.exports = CryptoResearchAssistant;

// CLI usage
if (require.main === module) {
  const cra = new CryptoResearchAssistant({
    assets: ['BTC', 'ETH', 'SOL']
  });

  (async () => {
    console.log('🚀 Crypto Research Assistant v1.0');
    console.log('================================\n');

    // Get signals
    console.log('1. Getting trading signals...');
    const signals = await cra.getSignals();
    signals.forEach(signal => {
      console.log(`${signal.asset}: ${signal.signal.toUpperCase()} (${signal.confidence}%)`);
      console.log(`   Price: $${signal.price?.toLocaleString()}`);
      console.log(`   Factors: ${signal.factors.join(', ')}`);
      console.log();
    });

    // Generate report
    console.log('2. Generating research report...');
    const report = await cra.generateReport();
    console.log(`\nSummary: ${report.summary.bullish} bullish, ${report.summary.bearish} bearish, ${report.summary.neutral} neutral`);
    console.log(`Top Pick: ${report.summary.topPick?.asset} (${report.summary.topPick?.confidence}% confidence)\n`);

    // Portfolio monitor
    console.log('3. Monitoring portfolio...');
    const portfolio = await cra.monitorPortfolio([
      { asset: 'BTC', quantity: 0.5, avgCost: 45000 },
      { asset: 'ETH', quantity: 5, avgCost: 3000 }
    ]);
    console.log(`Total Value: $${portfolio.totalValue.toLocaleString()}`);
    console.log(`Total P&L: $${portfolio.totalPnl.toFixed(2)} (${portfolio.totalPnlPercent.toFixed(2)}%)`);
  })();
}