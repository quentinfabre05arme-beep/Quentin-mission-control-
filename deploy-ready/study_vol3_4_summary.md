# WEEK 1 INTENSIVE: Vol 3-4 Study Summary
## Investment Research System - Market Context & Advanced Frameworks

**Study Date:** July 16, 2026  
**Time Invested:** ~2 hours  
**Source:** EXTRACTED_FRAMEWORKS.md (synthesized from Vol 3-4 content)

---

## 📊 VOL 3: MARKET CONTEXT & SECTOR VALUATION

### Key Framework: Multiple Expansion/Contraction

**The Core Insight:**
Stock price = Intrinsic Value × Market Sentiment Multiplier

```
Sector Multiple = f(Growth, Profitability, Interest Rates, Risk Appetite)
```

**Three Market Environments:**

| Environment | Driver | Action | Current (Jul 16) |
|-------------|--------|--------|------------------|
| **Expanding multiples** | Falling rates, risk-on | Favor growth stocks | ⚠️ Mixed signals |
| **Contracting multiples** | Rising rates, risk-off | Favor profitability | ⚠️ Watching Fed |
| **Earnings season** | Company-specific | Stock-picking alpha | ✅ HIMS catalyst |

### Timing Framework for Your System

Add this to research reports:
```javascript
market_context: {
  rates_direction: "stable/rising/falling",
  risk_appetite: "high/moderate/low",
  sector_multiple: "expanding/stable/contracting",
  timing: "favorable/neutral/caution"
}
```

---

## 🔍 VOL 4: ADVANCED FRAMEWORKS

### Framework 1: Risk Premium & Discount Rates (Damodaran)

**Equity Risk Premium Formula:**
```
Required Return = Risk-free rate + Beta × Equity Risk Premium

Current (July 2026):
- Risk-free: ~5% (10-year Treasury)
- ERP: ~4.5% (historical average)
- Required return: ~9-10%
```

**Application:**
- Any position must offer 9%+ annual return potential
- Adjust discount rates in DCF based on risk

### Framework 2: DeMark Indicators (Professional Timing)

**Sequential Setup:**
- **Setup:** 9 consecutive closes lower/higher
- **Countdown:** 13 closes satisfying conditions  
- **Signal:** Exhaustion point for reversal

**Enhancement for Your TA System:**
```javascript
demark: {
  setup: 9,           // Completed
  countdown: 7,      // In progress
  projected_completion: "2 days",
  signal: "exhaustion_soon"
}
```

### Framework 3: Liquidity & Flows

**Institutional Flow Analysis:**
- Track ETF inflows/outflows by sector
- Monitor hedge fund filings (13F)
- Watch options flow for sentiment

**Your System Addition:**
- Weekly sector flow check
- Correlation with price action

---

## ⚡ 3 ACTIONABLE INSIGHTS FOR IMMEDIATE IMPLEMENTATION

### 1. Add Market Context to Research Reports (30 min)

**Template addition to enhanced_research.js output:**
```javascript
{
  "market_context": {
    "rates_environment": "stable",
    "risk_appetite": "moderate", 
    "sector_outlook": "favorable",
    "timing_score": 75  // 0-100
  }
}
```

**Benefit:** Avoid buying into contracting multiples

### 2. Implement Stage-Based Discount Rates (1 hour)

**Current issue:** All DCFs use same discount rate

**Fix by asset risk:**
| Asset Type | WACC | Reason |
|------------|------|--------|
| Mature growth (HIMS) | 12% | Execution risk |
| Cyclical (SMCI) | 11% | Volatility |
| Crypto (BTC/ETH) | 15%+ | Regulatory/tech risk |

**Implementation:** Add `asset_type` parameter to models

### 3. Add DeMark Timing to TA Signals (2 hours)

**Enhancement to enhanced_ta_analysis.js:**

```javascript
function calculateDeMark(closePrices) {
  // Detect 9-bar setup
  // Track countdown
  // Return signal
}

// Add to output
tech_signals: {
  rsi: 45,
  macd: "bullish",
  demark: {
    setup_complete: true,
    countdown: 7,
    days_to_signal: 2
  }
}
```

**Benefit:** Professional-grade timing for entries/exits

---

## 📈 ENHANCEMENT PRIORITY (Week 1 Focus)

| Priority | Enhancement | Effort | Impact |
|----------|-------------|--------|--------|
| 🟢 High | Market context in reports | 30 min | Avoid bad timing |
| 🟢 High | Stage-based WACC | 1 hour | Better valuation |
| 🟡 Medium | DeMark indicators | 2 hours | Better timing |
| 🟡 Medium | Sector flow tracking | 2 hours | Early signals |

---

## 💡 KEY QUOTES FOR BEHAVIOR

**On Market Timing:**
> "Don't fight the Fed. When rates rise, multiples contract. When rates fall, multiples expand. Position accordingly."
> — Synthesized from Vol 3

**On Risk Premium:**
> "If you can't earn 9-10% on an asset, you're not being compensated for risk."
> — Damodaran framework (Vol 4)

**On Professional Timing:**
> "Amateurs buy breakouts. Pros buy exhaustion."
> — DeMark methodology (Vol 4)

---

## 🎯 IMPLEMENTATION CHECKLIST

- [x] Study complete (this document)
- [ ] Add market_context to research output
- [ ] Implement stage-based WACC in models
- [ ] Research DeMark indicator libraries
- [ ] Test enhanced timing on next trade

---

**Status:** ✅ Vol 3-4 frameworks extracted and actionable
**Next:** Implement 3 enhancements before Week 1 ends
