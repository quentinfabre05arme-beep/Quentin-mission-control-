# Technical-Only Backtest Results
## Enhanced Research System v2.0
**Date:** July 16, 2026  
**Period:** 90 days (Apr 17 - Jul 16, 2026)  
**Hold Period:** 5 days per signal  
**Methodology:** Technical indicators only (no sentiment)

---

## 🎯 EXECUTIVE SUMMARY

| Asset | Win Rate | Avg P&L/Trade | Profit Factor | Trades |
|-------|----------|---------------|---------------|--------|
| **BTC** | ✅ **65.7%** | +0.39% | **7.32** | 35 |
| **ETH** | ✅ **68.6%** | +1.80% | **1.09** | 35 |
| **HIMS** | ⚠️ **42.4%** | +6.62% | **0.31** | 33 |

---

## 📊 DETAILED BREAKDOWN

### Bitcoin (BTC/USD)

**Overall Performance:**
- Total Trades: 35
- Win Rate: **65.7%** (23 wins / 12 losses)
- Average P&L: **+0.39%** per trade
- Profit Factor: **7.32** (strong)
- Risk/Reward: Small wins, smaller losses

**Signal Performance:**
| Signal | Win Rate | Trades | Quality |
|--------|----------|--------|---------|
| WEAK_BUY | 73% | 15 | ✅ Best |
| WEAK_SELL | 88% | 8 | ✅ Excellent |
| SELL | 50% | 10 | ⚠️ Mixed |
| STRONG_SELL | 0% | 2 | ❌ Avoid |

**Key Insight:** BTC technical signals show **conservative but consistent** edge. Small average moves but high win rate. STRONG_SELL signals are unreliable — possibly catching falling knives.

---

### Ethereum (ETH/USD)

**Overall Performance:**
- Total Trades: 35
- Win Rate: **68.6%** (24 wins / 11 losses)
- Average P&L: **+1.80%** per trade
- Profit Factor: **1.09** (marginal)
- Risk/Reward: Moderate wins, larger losses

**Signal Performance:**
| Signal | Win Rate | Trades | Quality |
|--------|----------|--------|---------|
| WEAK_BUY | 79% | 14 | ✅ Best |
| WEAK_SELL | 67% | 6 | ✅ Good |
| SELL | 90% | 10 | ✅ Excellent |
| STRONG_SELL | 0% | 5 | ❌ Avoid |

**Key Insight:** Similar pattern to BTC — STRONG_SELL signals fail completely. WEAK_BUY and SELL work well. Recent STRONG_SELLs (Jul 7-11) all failed as ETH rallied +2% to +8%.

---

### Hims & Hers (HIMS)

**Overall Performance:**
- Total Trades: 33
- Win Rate: **42.4%** (14 wins / 19 losses)
- Average P&L: **+6.62%** per trade
- Profit Factor: **0.31** (poor)
- Risk/Reward: Large wins when right, larger losses when wrong

**Signal Performance:**
| Signal | Win Rate | Trades | Quality |
|--------|----------|--------|---------|
| BUY | **100%** | 5 | ✅ Perfect |
| WEAK_BUY | **75%** | 4 | ✅ Good |
| WEAK_SELL | 29% | 21 | ❌ Terrible |
| SELL | 0% | 3 | ❌ Avoid |

**Key Insight:** HIMS shows **massive asymmetry** — BUY signals are 100% accurate but rare. WEAK_SELL signals fail consistently. This aligns with HIMS recent strong uptrend — selling into strength was punished.

**Critical Finding:** The enhanced system's **WEAK BUY** signal on HIMS today has **75% historical win rate** with 4-5 day hold. This supports the live signal.

---

## 🔍 KEY PATTERNS DISCOVERED

### ✅ What Works
1. **WEAK_BUY signals**: 73-79% win rate across BTC/ETH
2. **BUY signals (HIMS)**: 100% win rate (small sample)
3. **Conservative entries**: Better than aggressive signals

### ❌ What Fails
1. **STRONG_SELL signals**: 0% win rate across all assets
   - Likely catching falling knives in uptrends
   - Recent ETH example: Jul 9 STRONG_SELL → ETH +8.41% 5 days later
2. **WEAK_SELL (HIMS)**: 29% win rate — terrible in uptrending stock

### 🎯 Implication for Live Signal
**HIMS WEAK BUY (today)** aligns with the best-performing historical pattern:
- Historical win rate: **75%** (HIMS WEAK_BUY)
- Average hold: 5 days
- Current catalyst: Earnings Aug 10 (extends timeframe)

---

## ⚠️ LIMITATIONS

1. **No Sentiment Component**: Backtest uses technicals only. Enhanced system adds sentiment which could improve or degrade performance.
2. **5-Day Hold**: Arbitrary — actual optimal hold unknown
3. **No Position Sizing**: Equal weight assumed
4. **No Transaction Costs**: Real returns would be lower
5. **Recent Volatility**: 90-day period includes unique market conditions

---

## 📈 FORWARD TEST PROPOSAL

Based on backtest, implement these rules:

| Rule | Rationale |
|------|-----------|
| **Trust WEAK_BUY** | 73-79% historical win rate |
| **Avoid STRONG_SELL** | 0% win rate — countertrend |
| **HOLD > 5 days** | Optimal hold may be longer for earnings plays |
| **Size by confidence** | Stronger signals (BUY > WEAK_BUY) get more size |
| **Stop loss: -6%** | HIMS avg loss was -8.74% — tighter stops needed |

---

## FILES

- `backtest_technical.js` — Backtesting engine
- `paper_trading.json` — Live paper trade tracker
- `paper_trade_manager.js` — Position management (next)

---

**Status:** Backtest complete ✅ | Forward test starting Jul 16, 2026
