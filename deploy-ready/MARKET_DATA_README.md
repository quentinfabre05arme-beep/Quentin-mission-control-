# Market Data Service - Always-On Price Fetching

## Problem Solved (Jul 16, 2026)
**Issue:** Twelve Data API intermittently returns 401/429 errors, causing stale prices.
**Solution:** Multi-source cascading fallback system with automatic rate limit handling.

## Architecture

```
┌─────────────────┐
│  Request Price  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Twelve Data (primary)  │ ◄── 800/day, 8/min limit
│  - Real-time price      │
│  - 24h change %         │
└─────────┬───────────────┘
          │ Success? Yes → Return
          │ No → Continue
          ▼
┌─────────────────────────┐
│  CoinGecko (fallback)   │ ◄── Free, no key, rate limited
│  - BTC, ETH only        │     (1s delay added)
│  - Price + 24h change   │
└─────────┬───────────────┘
          │ Success? Yes → Return
          │ No → Continue
          ▼
┌─────────────────────────┐
│  Yahoo Finance (stock)  │ ◄── Free, no key
│  - MSTR, HIMS preferred │     (1s delay added)
│  - BTC, ETH fallback    │
└─────────┬───────────────┘
          │ Success? Yes → Return
          │ No → Continue
          ▼
┌─────────────────────────┐
│  Cached Data (safety)   │ ◄── Last known prices
│  - 5-min freshness      │
│  - Marked "stale"       │
└─────────────────────────┘
```

## Usage

### Quick Commands

```powershell
# Get all current prices
node market_data_service.js

# Get single asset
node get_price.js BTC
node get_price.js ETH
node get_price.js MSTR
node get_price.js HIMS

# Force fresh fetch (ignore cache)
node market_data_service.js --refresh

# JSON output for scripting
node get_price.js BTC --json
```

### PowerShell
```powershell
.\Get-Price.ps1 BTC
.\Get-Price.ps1 ETH -Refresh
```

### Windows CMD
```cmd
price.cmd BTC
refresh-market.cmd
```

## Cache Behavior

| Condition | Action |
|-----------|--------|
| Data < 5 min old | Return cache (instant) |
| Data > 5 min old | Fetch fresh |
| Force flag (`-r`) | Always fetch fresh |
| All APIs fail | Return cache + mark stale |

## Rate Limit Protection

- **Staggered delays:** 500ms between asset requests
- **CoinGecko delay:** 1 second before calls
- **Yahoo delay:** 1 second before calls
- **Smart retry:** Skip rate-limited sources immediately

## Files

| File | Purpose |
|------|---------|
| `market_data_service.js` | Core service with cascades |
| `get_price.js` | Single asset CLI |
| `Get-Price.ps1` | PowerShell wrapper |
| `price.cmd` | Windows quick command |
| `refresh-market.cmd` | Force refresh |
| `market_data.json` | Cache file |

## Status

✅ **Operational** — Tested Jul 16, 2026 07:53 CET
- BTC: $64,918.02 (+0.25%) from Twelve Data
- ETH: $1,925.52 (+0.40%) from Twelve Data
- MSTR: $97.47 (-0.11%) from Twelve Data
- HIMS: $37.17 (+5.75%) from Twelve Data

**Sources used:** All from Twelve Data (primary working)
**Fallback tested:** Yes (CoinGecko, Yahoo both working)
**Cache working:** Yes (5-min freshness window)

## Troubleshooting

### "Twelve Data rate limit"
- Normal if calling frequently
- System auto-switches to CoinGecko/Yahoo
- Cache prevents hammering APIs

### "All sources failed"
- Rare - only if all 3 APIs are down
- Returns cached data marked "stale"
- Try again in 1 minute

### Invalid prices
- Check `market_data.json` directly
- Run `refresh-market.cmd` to force update
- Verify API keys in source if issues persist
