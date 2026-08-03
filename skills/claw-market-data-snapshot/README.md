# 🐾 Claw Market Data Snapshot

A world-class, zero-cost market data fetcher for OpenClaw agents. Designed for 24/7 autonomous finance workflows.

## Why This Skill
- **No paid API required** — works with free tiers and fallbacks
- **Battle-tested sources** — Twelve Data, CoinGecko, Yahoo Finance
- **Smart caching** — 5-minute freshness window, stale-on-failure
- **Clean JSON API** — easy to wire into dashboards, newsletters and trading signals
- **Self-healing** — automatic fallback chain if any source fails
- **Tested** — ships with a test suite; required for ClawHub publishing

## Supported Assets
| Symbol | Type |
|---|---|
| BTC | Crypto |
| ETH | Crypto |
| MSTR | Stock |
| HIMS | Stock |
| NVDA | Stock |
| TSLA | Stock |
| AAPL | Stock |
| COIN | Stock |
| SPY | Index |
| QQQ | Index |
| GLD | Gold |
| TLT | Bonds |

## Quick Start
```bash
openclaw skills install @claw/market-data-snapshot
```

```javascript
const MarketDataService = require('@claw/market-data-snapshot');
const service = new MarketDataService();
const market = await service.getAllPrices();
console.log(market.assets.BTC);
```

## CLI Usage (via underlying service)
```bash
node mission_control/market_data_service.js
node mission_control/market_data_service.js --json
node mission_control/market_data_service.js --refresh
```

## Output Format
```json
{
  "timestamp": "2026-08-03T09:00:00.000Z",
  "source": "twelve_data",
  "assets": {
    "BTC": { "price": 62806, "change_24h": -0.24, "source": "twelve_data", "signal": "NEUTRAL" }
  }
}
```

## Configuration
Set environment variables or leave defaults:
- `TWELVE_DATA_API_KEY` — optional, improves reliability
- `MARKET_CACHE_MINUTES` — default 5

## Architecture
```
getAllPrices()
  ├─ try Twelve Data (staggered, 500ms)
  ├─ try CoinGecko for crypto (1s delay)
  ├─ try Yahoo Finance for stocks
  └─ return cached data if all fail
```

## Testing
```bash
node skills/claw-market-data-snapshot/tests/test_service.js
```

## Security
This skill requires `network`, `filesystem:read` and `filesystem:write` permissions. It only reads/writes the cache file in the workspace cache directory.

## Pricing
- **Free** skill
- Optional support / DFY integration available at the linked DFY service page

## Changelog
- v1.0.0 — Initial release with cascading fallbacks, JSON CLI, class wrapper and test suite
