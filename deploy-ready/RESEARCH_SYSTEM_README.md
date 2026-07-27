# COMPLETE RESEARCH SYSTEM
## Technical + Fundamental + Sentiment Analysis Pipeline

### 🎯 Overview
Multi-layered research system that combines:
1. **Real-time Prices** (Multi-source cascade)
2. **Technical Analysis** (RSI, MACD, SMA, Bollinger Bands)
3. **Fundamental Analysis** (P/E, Market Cap, Profitability)
4. **Sentiment Analysis** (News headlines scored)
5. **Composite Score** (Weighted final rating)

---

## 🚀 Quick Commands

### Full Research Report (Recommended)
```powershell
# Complete analysis: Price + TA + Fundamentals + Sentiment
node mission_control/full_research.js SYMBOL

# Examples:
node mission_control/full_research.js BTC
node mission_control/full_research.js ETH
node mission_control/full_research.js MSTR
node mission_control/full_research.js HIMS
```

### Individual Modules
```powershell
# Just technical analysis
node mission_control/ta_analysis.js BTC

# Just fundamentals (stocks)
node mission_control/fundamental_analysis.js MSTR

# Just sentiment
node mission_control/sentiment_analysis.js HIMS

# Just price
node mission_control/get_price.js BTC
```

### JSON Output (for scripting)
```powershell
node full_research.js BTC --json
```

---

## 📊 Data Sources

| Layer | Source | Cost | Reliability |
|-------|--------|------|-------------|
| **Price** | Twelve Data → CoinGecko → Yahoo | Free | ⭐⭐⭐⭐⭐ |
| **Technical** | Twelve Data API | Free (800/day) | ⭐⭐⭐⭐⭐ |
| **Fundamental** | Yahoo Finance | Free | ⭐⭐⭐ |
| **Sentiment** | Serper.dev + News | Free (2.5K/mo) | ⭐⭐⭐⭐ |

---

## 📈 Technical Indicators

| Indicator | Signal | Interpretation |
|-----------|--------|----------------|
| **RSI** | >70 = Overbought, <30 = Oversold | Momentum oscillator |
| **MACD** | Crossover = Trend change | Trend following |
| **SMA 20/50** | Golden Cross / Death Cross | Trend direction |
| **Bollinger** | Width % = Volatility | Range / breakout |

---

## 🎯 Composite Scoring

| Score | Rating | Action |
|-------|--------|--------|
| +3+ | ⭐⭐⭐ STRONG BUY | Enter position |
| +2 | ⭐⭐ BUY | Consider buying |
| +1 | ⭐ WEAK BUY | Watch for entry |
| 0 | ⚪ HOLD | No action |
| -1 | ❌ WEAK SELL | Monitor closely |
| -2 | ❌❌ SELL | Consider reducing |
| -3- | ❌❌❌ STRONG SELL | Exit position |

**Factors weighted:**
- Technical signals (RSI, MACD, Trend): 40%
- Sentiment score: 30%
- Price momentum (24h): 30%

---

## 📁 Files

| File | Purpose | Usage |
|------|---------|-------|
| `full_research.js` | **Main entry point** — Combined analysis | `node full_research.js BTC` |
| `market_data_service.js` | Price fetching with fallbacks | `node market_data_service.js` |
| `ta_analysis.js` | Technical indicators | `node ta_analysis.js SYMBOL` |
| `fundamental_analysis.js` | Financial metrics | `node fundamental_analysis.js SYMBOL` |
| `sentiment_analysis.js` | News sentiment | `node sentiment_analysis.js SYMBOL` |
| `get_price.js` | Quick price lookup | `node get_price.js SYMBOL` |

---

## ⚠️ Limitations & Notes

1. **Twelve Data Rate Limits**: 8 requests/minute, 800/day
   - System auto-staggers requests (500ms delay between assets)
   - Falls back to CoinGecko/Yahoo if rate limited

2. **Yahoo Finance**: Unofficial API, may require different endpoint
   - Currently uses query1.finance.yahoo.com
   - May return limited data without authentication

3. **Sentiment Scoring**: Basic keyword matching
   - Positive: surge, bullish, breakout, rally, gain, buy
   - Negative: crash, bearish, dump, fall, sell
   - For advanced: consider ML-based NLP service

4. **Fundamentals**: Limited for crypto
   - Only stocks (MSTR, HIMS) have fundamentals
   - Crypto uses on-chain metrics instead (not yet implemented)

---

## 🔧 Configuration

### API Keys (already set)
- **Twelve Data**: `07f9ead31a5c426ea238e71895beeaa1`
- **Serper.dev**: `1a32d04a8215dde72b67e554c94409ce580094f3`

### Rate Limits
- Twelve Data: 8/min, 800/day
- CoinGecko: ~50 calls/min (free)
- Yahoo: ~100 calls/min (unofficial)
- Serper: 2,500/month

---

## 📊 Sample Output

```
═══════════════════════════════════════════
   FULL RESEARCH REPORT: HIMS
═══════════════════════════════════════════

📅 16/07/2026 07:59:33

💰 CURRENT PRICE
   $37.17 (+5.75%)
   Source: twelvedata

📊 TECHNICAL ANALYSIS
   RSI: 58.5 (NEUTRAL)
   MACD: BEARISH
   Trend: UPTREND
   Signal: SELL

📈 FUNDAMENTALS
   Market Cap: $8.2B
   P/E: N/A
   Profit Margin: -12%

🔮 SENTIMENT
   Score: 0.40 → NEUTRAL
   Headlines: 4+ / 5= / 1-

🎯 COMPOSITE ASSESSMENT
   Score: 0
   Rating: HOLD

   Key Factors:
   • Technical: SELL
   • Trend: Up
   • Momentum: Strong
```

---

## 🔄 Next Steps / Enhancements

- [ ] Add on-chain metrics for crypto (BTC, ETH)
- [ ] Reddit sentiment scraping
- [ ] X/Twitter sentiment via API
- [ ] Google Trends integration
- [ ] Historical backtesting of signals
- [ ] Alert system when composite score changes

---

**Status**: ✅ Operational (Jul 16, 2026)
**Tested**: BTC, ETH, MSTR, HIMS
**Cost**: $0 (all free APIs)
