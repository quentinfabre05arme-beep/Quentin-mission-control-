# 🏦 IBKR Integration — Setup Guide

## What This Solves

| Problem | IBKR Solution |
|---------|---------------|
| Twelve Data quota exhausted | **Unlimited** real-time quotes via TWS |
| Fear & Greed static at 50 | Real market depth + option flow data |
| No intraday stock changes | **Real-time tick data** |
| API reliability | Direct broker connection, no third-party limits |
| Cost | **Free** with your existing IBKR account |

## Quick Start (5 minutes)

### Step 1: Install TWS or IB Gateway
1. Download: https://www.interactivebrokers.com/en/index.php?f=16457
2. Log in with your IBKR credentials
3. Recommended: Use **IB Gateway** (lighter than full TWS)

### Step 2: Enable API in TWS/Gateway
1. Edit → Global Configuration → API → Settings
2. ✅ Enable "ActiveX and Socket Clients"
3. Socket port: **7496** (TWS) or **4001** (Gateway)
4. Allow connections from: **127.0.0.1** (localhost)
5. ✅ Create API message log (for debugging)

### Step 3: Install Node.js Library
```bash
cd alpha_fund_v3
npm install @stoqey/ib
```

### Step 4: Enable in Alpha Fund
Edit `alpha_fund_v3/data/ibkr_connector.js`:
```javascript
IBKR_CONFIG.enabled = true;
```

### Step 5: Test Connection
```bash
node alpha_fund_v3/data/ibkr_connector.js test
```

## What You Get

| Feature | Twelve Data | IBKR |
|---------|-------------|------|
| **Price updates** | Delayed 15 min | **Real-time** |
| **Stocks** | 800/day limit | **Unlimited** |
| **Crypto** | Limited | **BTC, ETH futures** |
| **Options flow** | ❌ | ✅ **Full options data** |
| **Level 2 depth** | ❌ | ✅ **Depth-of-book** |
| **Historical** | Limited | **1+ years tick data** |
| **Cost** | Free tier limits | **Free with account** |

## Architecture

```
Alpha Fund v3.0
    ├── Research Engine
    │   └── unified_research.js
    │       └── fetchPrices()
    │           ├── Try: IBKR (real-time) ← NEW
    │           ├── Fallback: market_data.json (cache)
    │           └── Fallback: Twelve Data (legacy)
    └── IBKR Connector
        └── ibkr_connector.js
            ├── Connects to TWS/Gateway
            ├── Streams real-time ticks
            └── Caches for 5 minutes
```

## Data Flow

1. **IBKR** (primary) → Real-time streaming
2. **Cache** (fallback) → Last known prices (5 min TTL)
3. **Twelve Data** (legacy) → If IBKR offline

## Next Steps After Setup

1. **Connect** → Test `node ibkr_connector.js test`
2. **Verify** → Run `node orchestrator.js daily` (should use IBKR prices)
3. **Monitor** → Check logs for IBKR connection status
4. **Upgrade** → Add options flow scanning
5. **Scale** → Paper trade with real-time data

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Connection refused" | TWS not running or API not enabled |
| "Market data subscription required" | Enable market data in IBKR account |
| Slow responses | Use IB Gateway instead of full TWS |
| Crypto not working | IBKR crypto requires specific permissions |

## Security Notes

- IBKR connection is **local only** (localhost)
- No credentials stored in code
- TWS/Gateway handles authentication
- API messages are encrypted

## Files
- `alpha_fund_v3/data/ibkr_connector.js` — Core connector
- `alpha_fund_v3/data/ibkr_cache.json` — Price cache (auto-generated)
- `alpha_fund_v3/ibkr_setup.md` — This guide

---

**Once connected, the Alpha Fund will have unlimited real-time market data with zero API limits.**
