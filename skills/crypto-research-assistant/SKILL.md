# Skill: Crypto Research Assistant
# Version: 1.0
# Price: $99
# Description: Automated crypto market research, analysis, and signal generation

## Overview

This skill provides autonomous cryptocurrency research:
- Real-time price monitoring across exchanges
- Technical analysis (RSI, MACD, SMA, Bollinger)
- On-chain metrics (mempool, whale activity)
- News sentiment analysis
- Signal generation (buy/sell/hold)
- Portfolio tracking and alerts

## Features

### 1. Market Data Collection
- Price data: CoinGecko, CoinMarketCap, Twelve Data
- 24h change, volume, market cap
- Historical price charts
- Multi-exchange comparison

### 2. Technical Analysis
- RSI (14-day and 7-day)
- MACD with signal line
- SMA (20, 50, 200)
- EMA (12, 26)
- Bollinger Bands
- Stochastic oscillator
- ATR (Average True Range)

### 3. On-Chain Analysis
- Mempool size and congestion
- Whale wallet tracking
- Exchange inflows/outflows
- Network hash rate
- Active addresses

### 4. Sentiment Analysis
- News aggregation (Serper.dev)
- Social media sentiment (Twitter/X)
- Fear & Greed Index
- Funding rates (derivatives)
- Social volume metrics

### 5. Signal Generation
- Composite scoring algorithm
- Technical weight: 35%
- Momentum weight: 25%
- Sentiment weight: 25%
- Alignment weight: 15%

**Signal Levels:**
- +4: ⭐⭐⭐⭐ STRONG BUY
- +3: ⭐⭐⭐ BUY
- +2: ⭐⭐ WEAK BUY
- +1/-1: ⚪ HOLD
- -2: ❌❌ WEAK SELL
- -3: ❌❌❌ SELL
- -4: ❌❌❌❌ STRONG SELL

### 6. Portfolio Tracking
- Real-time P&L calculation
- Risk metrics (Sharpe, drawdown)
- Allocation analysis
- Rebalancing suggestions
- Stop-loss monitoring

## Installation

```bash
cd skills
npm install crypto-research-assistant
node setup.js --assets=BTC,ETH,SOL,AVAX
```

## Configuration

```json
{
  "assets": ["BTC", "ETH", "SOL", "AVAX", "MATIC"],
  "exchanges": ["binance", "coinbase", "kraken"],
  "indicators": {
    "rsi": { "enabled": true, "period": 14 },
    "macd": { "enabled": true, "fast": 12, "slow": 26 },
    "bollinger": { "enabled": true, "period": 20, "stdDev": 2 }
  },
  "alerts": {
    "priceChange": 5,
    "rsiOverbought": 70,
    "rsiOversold": 30,
    "portfolioStopLoss": -10
  },
  "dataSources": {
    "primary": "coingecko",
    "fallback": "coinmarketcap"
  }
}
```

## Usage

### Research Report
```javascript
const cra = require('crypto-research-assistant');

// Generate full research report
const report = await cra.generateReport({
  assets: ['BTC', 'ETH'],
  indicators: ['rsi', 'macd', 'bollinger'],
  includeSentiment: true,
  includeOnChain: true
});

console.log(report.summary);
```

### Signal Check
```javascript
// Get trading signals
const signals = await cra.getSignals({
  assets: ['BTC', 'ETH', 'SOL'],
  timeframe: '1d'
});

signals.forEach(signal => {
  console.log(`${signal.asset}: ${signal.action} (${signal.confidence}%)`);
});
```

### Portfolio Monitor
```javascript
// Monitor portfolio
const portfolio = await cra.monitorPortfolio({
  positions: [
    { asset: 'BTC', quantity: 0.5, avgCost: 45000 },
    { asset: 'ETH', quantity: 5, avgCost: 3000 }
  ]
});

console.log(`Total P&L: $${portfolio.totalPnl}`);
```

### Alert Setup
```javascript
// Set up price alerts
await cra.setAlert({
  asset: 'BTC',
  condition: 'priceAbove',
  value: 50000,
  notify: 'telegram'
});
```

## API

### Methods

#### `generateReport(options)`
Generate comprehensive research report
- `options.assets` - Array of asset symbols
- `options.indicators` - Technical indicators to include
- `options.includeSentiment` - Include news sentiment
- `options.includeOnChain` - Include on-chain metrics
- Returns: Report object with analysis

#### `getSignals(options)`
Get trading signals
- `options.assets` - Assets to analyze
- `options.timeframe` - Analysis timeframe
- Returns: Array of signal objects

#### `monitorPortfolio(options)`
Monitor portfolio performance
- `options.positions` - Current positions
- Returns: Portfolio analysis

#### `setAlert(options)`
Set price or indicator alert
- `options.asset` - Asset symbol
- `options.condition` - Alert condition
- `options.value` - Trigger value
- Returns: Alert confirmation

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Basic** | $99 | 5 assets, basic indicators, daily reports |
| **Pro** | $199 | 20 assets, all indicators, real-time alerts |
| **Enterprise** | $499 | Unlimited, custom strategies, API access |

## Support

- Documentation: docs.openclaw.ai/skills/crypto-research-assistant
- Issues: github.com/openclaw/skills/issues
- Updates: Auto-update via skill marketplace

## Changelog

### v1.0 (2026-07-25)
- Initial release
- Multi-exchange price data
- 7 technical indicators
- On-chain metrics
- Sentiment analysis
- Signal generation
- Portfolio tracking

## License

MIT License - OpenClaw Skill Marketplace
