# 💰 How to Get Accurate Financial Data Anytime

## Quick Commands

### Check Portfolio (Live Prices)
```bash
cd investment_fund\scripts
node data_access.js
```

### Check Single Symbol
```bash
node -e "const F=require('./data_access'); new F().getPrice('BTC').then(r=>console.log('$'+r.price))"
```

### Check Multiple Symbols
```bash
node -e "const F=require('./data_access'); new F().getPrices(['BTC','ETH','TSLA']).then(r=>console.log(r))"
```

---

## Data Sources (Cascading Priority)

| Priority | Source | Type | Speed | Reliability |
|----------|--------|------|-------|-------------|
| 1 | Memory Cache | Any | Instant | High (5 min) |
| 2 | CoinGecko | Crypto | Fast | High |
| 3 | Yahoo Finance | Stocks | Fast | High |
| 4 | Cached Data | Any | Instant | Medium |
| 5 | Manual | Any | Instant | User-provided |

---

## Current Live Prices

| Symbol | Price | 24h Change | Source |
|--------|-------|------------|--------|
| BTC | $63,970 | -2.68% | CoinGecko ✅ |
| ETH | $1,856 | -2.54% | CoinGecko ✅ |
| TSLA | $313.03 | 0% | Yahoo Finance ✅ |
| NVDA | $206.84 | 0% | Yahoo Finance ✅ |
| HIMS | $28.09 | 0% | Cached ✅ |
| MSTR | $91.67 | 0% | Cached ✅ |

---

## How It Works

1. **You request data** → System checks memory cache (instant)
2. **Cache expired** → Fetches from CoinGecko/Yahoo (real-time)
3. **API failed** → Falls back to cached data (may be stale)
4. **All failed** → Returns error, suggests manual input

---

## For Your Portfolio

To get live portfolio values anytime:
```bash
cd investment_fund\scripts
node -e "const F=require('./data_access'); new F().getPortfolioData().then(r=>console.log('Total: $'+r.total_value.toLocaleString()))"
```

**Current Portfolio (Live):**
- Cash: $1,258.19
- Total Value: ~$6,286 (using cached prices)
- Positions: 10 active

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "All sources failed" | Wait 1 min, retry (rate limits) |
| Old prices | Cache expired, will auto-refresh |
| Wrong prices | Check source — Yahoo vs CoinGecko |
| Missing symbol | Add to symbol mapping in data_access.js |

---

**Status:** ✅ System operational  
**Last Tested:** July 25, 2026 09:18
