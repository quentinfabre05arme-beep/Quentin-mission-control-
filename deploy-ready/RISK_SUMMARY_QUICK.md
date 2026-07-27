# Risk Management Summary
## Position Sizing & Portfolio Construction

---

## 🎯 OPTIMAL NUMBER OF POSITIONS

| Portfolio | Positions | Risk Heat | Best For |
|-----------|-----------|-----------|----------|
| **Conservative** | **5-8** | **15-20%** | ✅ 5% monthly target |
| Moderate | 8-12 | 25-30% | Higher returns |
| Aggressive | 12-20+ | 40-50% | Harder to manage |

**Your target: 6 positions** (currently 5)

---

## 📊 YOUR CURRENT PORTFOLIO HEAT

| Asset | Size | Stop % | Heat % |
|-------|------|--------|--------|
| HIMS | 12% | 5.8% | 0.70% |
| SMCI | 8% | 8.9% | 0.71% |
| ETH | 10% | 4.7% | 0.47% |
| BTC | 8% | 1.6% | 0.13% |
| COIN | 6% | 7.3% | 0.44% |
| **TOTAL** | **44%** | — | **2.45%** ✅ |

**Status:** Safe (<4% heat)

---

## 📐 POSITION SIZING FORMULA

```
Position % = Account Risk % ÷ Stop Loss %

Base: 1% account risk ($1,000 on $100K)
```

### Adjustments:
| Factor | Adjustment |
|--------|-----------|
| HIGH confidence | +2% |
| BUY signal (rare) | +3% |
| MEDIUM confidence | -2% |
| Large stop (>8%) | -3% |

**Max:** 15% per position  
**Min:** 6% per position

---

## 🎯 THE 1-2-3 RISK RULE

| Rule | Limit | Your Setting |
|------|-------|--------------|
| **1%** | Risk per trade | $1,000 |
| **2%** | Daily max loss | $2,000 |
| **3%** | Weekly max loss | $3,000 |

---

## 📈 TARGET 6-POSITION PORTFOLIO

| # | Asset | Size | Sector | Heat |
|---|-------|------|--------|------|
| 1 | HIMS | 12% | Healthcare | 0.70% |
| 2 | SMCI | 8% | AI/Tech | 0.71% |
| 3 | ETH | 10% | Crypto | 0.47% |
| 4 | BTC | 8% | Crypto | 0.13% |
| 5 | COIN | 6% | FinTech | 0.44% |
| 6 | **SPY/QQQ** | **10%** | **Broad Market** | **~0.5%** |

**Target:** 54% deployed, 46% cash, ~3% heat

---

## ⚠️ WORST CASE (All Stops Hit)

| Position | Loss |
|----------|------|
| HIMS | -$696 |
| SMCI | -$712 |
| ETH | -$470 |
| BTC | -$128 |
| COIN | -$438 |
| **Total** | **-$2,444 (2.4%)** ✅ |

**Manageable risk**

---

## ✅ BEST CASE (All Targets Hit)

| Position | Gain |
|----------|------|
| HIMS | +$912 |
| SMCI | +$928 |
| ETH | +$730 |
| BTC | +$704 |
| COIN | +$636 |
| **Total** | **+$3,910 (3.9%)** |

**Path to 5%: Need one more trade**

---

## 🔄 SCALE-IN STRATEGY (Recommended)

| Stage | Condition | Size |
|-------|-----------|------|
| **1** | Initial signal | 50% |
| **2** | +3% move | 30% |
| **3** | +5% breakout | 20% |
| **Total** | Full position | 100% |

---

## 📋 QUICK COMMANDS

```powershell
# Calculate position size
node position_sizing_calculator.js 100000 WEAK_BUY 26.89 24.5 MEDIUM SMCI

# Check portfolio
node paper_trade_manager.js status
```

---

## 🎯 IMMEDIATE ACTION

**Add 6th position: 10% in SPY or QQQ**
- Reduces crypto concentration (24% → 18%)
- Adds market exposure
- Completes diversification

**Entry trigger:** Pullback to 20-day SMA or WEAK_BUY signal

---

**Files:** `RISK_MANAGEMENT_GUIDE.md`, `position_sizing_calculator.js`
