# Claw Market Data Snapshot

## Description
A production-grade, multi-source market data fetcher for OpenClaw agents. Retrieves real-time prices and 24h changes for crypto and equities with cascading fallbacks: Twelve Data → CoinGecko → Yahoo Finance → local cache.

## Version
1.0.0

## Author
Claw

## Tags
market-data, finance, crypto, stocks, api, monitoring, free-tier

## Requirements
- Node.js 18+
- `fs`, `https`, `child_process` available
- Optional: `TWELVE_DATA_API_KEY` env var for primary source

## Installation
```bash
openclaw skills search "market data"
openclaw skills install @claw/market-data-snapshot
```

## Usage
```javascript
const MarketDataService = require('@claw/market-data-snapshot');
const service = new MarketDataService();
const data = await service.getAllPrices();
console.log(data.assets.BTC.price);
```

## API

### `new MarketDataService(options)`
- `options.force` — bypass cache and fetch fresh prices

### `getAllPrices()`
Returns `{ timestamp, source, assets: { BTC: { price, change_24h, source }, ... } }`.

### `getPrice(symbol)`
Returns price data for a single symbol.

### `refresh()`
Forces a fresh fetch and updates the cache file.

## Permissions
- `filesystem:read` — read cache
- `filesystem:write` — update cache
- `network` — call price APIs

## Data Sources
1. Twelve Data (primary) — stocks + crypto, 24h change
2. CoinGecko (crypto fallback)
3. Yahoo Finance (stock fallback)
4. Local cache (last resort)

## Test
```bash
node skills/claw-market-data-snapshot/tests/test_service.js
```

## License
MIT
