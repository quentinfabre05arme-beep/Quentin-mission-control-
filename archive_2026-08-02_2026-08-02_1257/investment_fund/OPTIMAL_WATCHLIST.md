# Alpha Fund — Market Research Powerhouse

## Mission Statement

**Become the world's most capable autonomous market research system for identifying undervalued, asymmetrical investment opportunities.**

Not a trading fund. A **discovery engine** that finds positions with:
- **Asymmetric risk/reward** (5:1+ payoff potential)
- **Undervalued by market** (30%+ discount to intrinsic value)
- **Catalyst visibility** (near-term events to close the gap)
- **Information edge** (data/insights market hasn't priced in)

---

## Strategic Shift: Research → Trading

| Old Approach | New Approach |
|--------------|--------------|
| Signal generation only | Discovery + validation + sizing |
| Paper trading | Live execution with real capital |
| 12 liquid tickers | 100+ names across asset classes |
| Technical/sentiment only | Deep fundamental + alternative data |
| Daily cycles | Continuous real-time monitoring |
| Reactive alerts | Predictive opportunity scoring |

---

## Core Discovery Framework

### 1. Asymmetry Detection Engine
```
Risk/Reward Score = (Upside Potential) / (Downside Risk) × Catalyst Probability

Target: Score > 5.0
Minimum: Score > 3.0
```

### 2. Valuation Gap Scanner
- DCF models for equities
- Network value for crypto
- NAV analysis for REITs/commodities
- Peer multiples with quality adjustments

### 3. Catalyst Calendar
- Earnings announcements
- Product launches
- Regulatory decisions
- Macro events
- Insider buying

### 4. Information Edge Sources
- Alternative data (satellite, credit cards, web traffic)
- On-chain crypto intelligence
- Options flow (unusual activity)
- Institutional 13F filings
- Whisper numbers vs consensus

---

## Expanded Universe (100+ Names)

### Current: 12 Core Tickers
BTC, ETH, NVDA, TSLA, MSTR, AAPL, HIMS, COIN, SPY, QQQ, GLD, TLT

### Phase 1 Additions (25 names)
**Growth/Disruptive:**
- PLTR (Palantir - AI/data analytics)
- CRWD (CrowdStrike - cybersecurity)
- SNOW (Snowflake - cloud data)
- NET (Cloudflare - edge computing)
- DUOL (Duolingo - EdTech)

**Value/Contrarian:**
- BRK.B (Berkshire - quality at fair price)
- UNH (UnitedHealth - defensive healthcare)
- V (Visa - payments moat)
- MA (Mastercard - duopoly pricing)
- JPM (JPMorgan - rates beneficiary)

**International:**
- ASML (Europe - lithography monopoly)
- TSM (Taiwan - foundry leader)
- BABA (China - e-commerce recovery)
- TCEHY (Tencent - gaming/social)

**Crypto:**
- SOL (Solana - high-performance L1)
- LINK (Chainlink - oracle network)
- AAVE (DeFi lending protocol)
- MKR (MakerDAO - decentralized stablecoin)

### Phase 2 Additions (50+ names)
- Small-cap growth (S&P 600 constituents)
- Emerging market equities
- Commodity proxies (lithium, uranium, copper miners)
- SPACs with asymmetric redemption features
- Distressed credit opportunities

### Phase 3: Global Macro
- Currency pairs (carry trades, misvaluations)
- Sovereign bonds (rate divergence plays)
- Commodity futures (contango/backwardation)

---

## Discovery Workflow (Autonomous)

### Step 1: Broad Scan (Every 15 minutes)
- Price action anomalies (±5% moves)
- Volume spikes (>3x average)
- Options flow unusual activity
- News sentiment shifts
- Social media trending

### Step 2: Deep Dive (Triggered on signal)
- Pull 5-year financials
- Build DCF/NAV model
- Identify catalysts
- Check insider activity
- Analyze competitor set
- Options market positioning

### Step 3: Scoring & Ranking
| Factor | Weight | Source |
|--------|--------|--------|
| Valuation gap | 25% | DCF/NAV vs market price |
| Asymmetry | 25% | Risk/reward ratio |
| Catalyst certainty | 20% | Timeline + probability |
| Information edge | 20% | Alternative data score |
| Technical setup | 10% | Support/resistance |

### Step 4: Position Sizing
```python
def position_size(confidence, asymmetry, liquidity):
    base = 1.0  # 1% of fund
    confidence_mult = confidence / 100  # 0.5-1.5x
    asymmetry_mult = min(asymmetry / 5, 2.0)  # Cap at 2x
    liquidity_adj = min(liquidity / 1000000, 1.0)  # $1M+ daily volume
    
    return base * confidence_mult * asymmetry_mult * liquidity_adj
```

### Step 5: Execution & Monitoring
- Entry orders (TWAP for size)
- Stop loss (hard and trailing)
- Take profit levels (25%, 50%, 100%)
- Position updates (daily P&L, thesis check)
- Exit triggers (thesis invalidated, better opportunity)

---

## Information Edge Stack

### Alternative Data Sources
| Data Type | Provider | Cost | Signal |
|-----------|----------|------|--------|
| Satellite imagery | Orbital Insight | $$ | Retail parking, construction |
| Credit card data | Second Measure | $$ | Consumer spending trends |
| Web traffic | SimilarWeb | $ | Digital engagement |
| Job postings | LinkUp | $ | Hiring momentum |
| Shipping data | ImportGenius | $$ | Supply chain visibility |
| Options flow | Cheddar Flow | $ | Smart money positioning |
| Crypto on-chain | Glassnode | $ | Exchange flows, holder behavior |
| Reddit sentiment | Custom NLP | Free | Retail positioning |
| Twitter sentiment | Custom NLP | Free | Narrative tracking |

### Implementation Priority
1. **Free tier first:** Reddit/Twitter NLP, Glassnode, options flow
2. **Paid tier when profitable:** Credit card data, satellite imagery
3. **Custom scrapers:** Earnings call transcripts, SEC filings

---

## Autonomous Execution Rules

### EXECUTE Without Approval:
- Positions under 2% of fund
- Research score > 7.0/10
- Liquidity > $5M daily volume
- Clear stop loss set

### QUEUE for Approval:
- Positions 2-5% of fund
- Research score 5-7/10
- New asset class (first time)
- Thesis with high uncertainty

### WAIT for Discussion:
- Positions > 5% of fund
- Research score < 5/10
- Illiquid names (< $1M daily)
- Binary event outcomes

---

## Performance Metrics

### Discovery Metrics
- Opportunities identified/week
- Hit rate (score > 7.0 → actual return > benchmark)
- False positive rate
- Average days to catalyst

### Portfolio Metrics
- Alpha vs S&P 500 (target: +15% annually)
- Sharpe ratio (target: > 2.0)
- Max drawdown (limit: -20%)
- Win rate (target: > 55%)
- Average winner/loser ratio (target: > 3:1)

### System Metrics
- Research coverage (% of universe with current score)
- Update frequency (median hours since last refresh)
- Signal latency (time from event → score update)

---

## Implementation Roadmap

### Week 1: Infrastructure
- [ ] Expand ticker universe to 25 names
- [ ] Build DCF model template
- [ ] Create catalyst calendar scraper
- [ ] Deploy options flow monitor

### Week 2: Discovery Engine
- [ ] Broad scan alerts (15-min frequency)
- [ ] Deep dive automation
- [ ] Scoring algorithm v1
- [ ] Position sizing calculator

### Week 3: Information Edge
- [ ] Glassnode integration (crypto on-chain)
- [ ] Reddit sentiment pipeline
- [ ] Options unusual activity scraper
- [ ] SEC filing watcher

### Week 4: Execution
- [ ] Paper trade new workflow (100 positions)
- [ ] Validate hit rate
- [ ] Deploy live with small size ($1K per position)
- [ ] Scale up based on performance

---

## Risk Management (Tightened)

| Rule | Limit |
|------|-------|
| Single position max | 5% of fund |
| Sector concentration | 25% of fund |
| Correlated positions | 40% of fund |
| Daily loss limit | 2% of fund |
| Weekly loss limit | 7% of fund |
| Max drawdown | -20% (hard stop) |
| Cash position | Minimum 10% |

---

## Next Actions

1. **Expand universe** — Add Phase 1 tickers (25 names)
2. **Build DCF engine** — Automated valuation models
3. **Deploy scanners** — Options flow, on-chain, social
4. **Create scoring system** — 7-factor model with weights
5. **Paper trade new workflow** — 100 positions to validate
6. **Go live** — Start with 1% positions, scale on success

---

*Research powerhouse mode: ACTIVATED*
*Target: 5+ high-conviction opportunities/week with asymmetrical payoff*
*Not just tracking prices — discovering value the market hasn't seen.*

## Why Expand from 4 to 12 Tickers?

**Current state:** 4 tickers (BTC, ETH, MSTR, HIMS) — good for focus, but lacks:
- Diversification across sectors
- Exposure to AI revolution (missing NVDA)
- Exposure to EV/autonomy (missing TSLA)
- Big tech stability (missing AAPL, MSFT)
- Broad market exposure (missing indices)
- Defensive positioning (missing GLD)

**Research conclusion:** 12 tickers optimal for:
- Sector coverage: Crypto, AI, EV, Big Tech, Healthcare, Indices, Gold
- Signal diversity: Different correlation patterns
- Risk management: Lower portfolio volatility
- Alpha generation: Multiple uncorrelated opportunities

---

## Proposed Expanded Watchlist (12 Tickers)

### Tier 1: Core Holdings (High Conviction)
| Ticker | Category | Weight | Thesis |
|--------|----------|--------|--------|
| **BTC** | Crypto Store of Value | 15% | Digital gold, institutional adoption, hedge against fiat debasement |
| **ETH** | Smart Contract Platform | 10% | DeFi, L2 scaling, institutional DeFi adoption |
| **NVDA** | AI Infrastructure | 15% | Dominant AI chip maker, data center capex beneficiary |
| **TSLA** | EV/Autonomy/Robotics | 12% | EV leader, FSD progress, Optimus robotaxi potential |

### Tier 2: Growth & Exposure (Medium Conviction)
| Ticker | Category | Weight | Thesis |
|--------|----------|--------|--------|
| **MSTR** | Bitcoin Proxy | 8% | Leveraged BTC exposure via treasury strategy |
| **AAPL** | Consumer Tech | 10% | Ecosystem moat, services growth, AI integration |
| **HIMS** | Telehealth/GLP-1 | 5% | Healthcare disruption, GLP-1 weight loss trend |
| **COIN** | Crypto Infrastructure | 5% | Regulated exchange, ETF beneficiary, institutional onramp |

### Tier 3: Diversification & Defense (Lower Conviction/Stability)
| Ticker | Category | Weight | Thesis |
|--------|----------|--------|--------|
| **SPY** | S&P 500 Index | 10% | Broad US market exposure, lower beta anchor |
| **QQQ** | Nasdaq 100 | 8% | Tech-heavy growth exposure |
| **GLD** | Gold ETF | 5% | Defensive hedge, inflation protection |
| **TLT** | Long-term Treasuries | 7% | Duration play if rates cut, recession hedge |

---

## Sector Coverage

| Sector | Tickers | Allocation |
|--------|---------|------------|
| **Crypto** | BTC, ETH, MSTR, COIN | 38% |
| **AI/Tech** | NVDA, TSLA, AAPL, QQQ | 45% |
| **Healthcare** | HIMS | 5% |
| **Broad Market** | SPY | 10% |
| **Defensive** | GLD, TLT | 12% |

---

## Why These Specific Tickers?

### NVDA (NVIDIA)
- **The AI Trade:** Controls 80%+ of AI training chip market
- **Catalyst:** Data center capex boom, Blackwell architecture
- **Risk:** China export restrictions, valuation premium
- **Data Source:** Twelve Data (fundamentals available)

### TSLA (Tesla)
- **Multi-theme:** EVs + FSD + Energy + Robotics
- **Catalyst:** Robotaxi unveil, Model 2, Optimus progress
- **Risk:** Execution on autonomy timeline, competition
- **Data Source:** Twelve Data

### AAPL (Apple)
- **Ecosystem Moat:** 2B+ active devices, services growing
- **Catalyst:** Apple Intelligence, Vision Pro, India expansion
- **Risk:** China exposure, hardware saturation
- **Data Source:** Twelve Data

### COIN (Coinbase)
- **Crypto Infrastructure:** Regulated exchange, ETF custody
- **Catalyst:** Institutional adoption, Base L2 growth
- **Risk:** Regulatory uncertainty, fee compression
- **Data Source:** Twelve Data

### SPY (S&P 500 ETF)
- **Broad Exposure:** 500 largest US companies
- **Purpose:** Reduce portfolio volatility, beta anchor
- **Data Source:** Yahoo Finance fallback

### QQQ (Nasdaq 100)
- **Tech Exposure:** 100 largest non-financial Nasdaq companies
- **Purpose:** Growth tilt, MAG7 exposure
- **Data Source:** Yahoo Finance fallback

### GLD (SPDR Gold Trust)
- **Defensive:** Physical gold backing
- **Purpose:** Hedge against equity drawdowns, inflation
- **Data Source:** Yahoo Finance fallback

### TLT (20+ Year Treasury Bond ETF)
- **Duration Play:** Long-term US government bonds
- **Purpose:** Recession hedge, rate cut beneficiary
- **Data Source:** Yahoo Finance fallback

---

## Implementation Plan

### Phase 1 (This Week)
- [ ] Add NVDA, TSLA, AAPL to market_data_service.js
- [ ] Update research cycles to cover 7 tickers
- [ ] Test data fetching for new tickers

### Phase 2 (Next Week)
- [ ] Add COIN, SPY, QQQ, GLD, TLT
- [ ] Build sector allocation dashboard
- [ ] Create correlation matrix analysis

### Phase 3 (Ongoing)
- [ ] Full 12-ticker research cycles
- [ ] Sector rotation signals
- [ ] Risk parity weighting

---

## Expected Benefits

| Metric | Current (4) | Proposed (12) |
|--------|-------------|---------------|
| **Sector Coverage** | 3 sectors | 7 sectors |
| **Avg Correlation** | High (0.7-0.9) | Lower (0.3-0.6) |
| **Max Drawdown** | -15% | -10% (estimated) |
| **Alpha Sources** | 4 | 12 |
| **Research Cycles/Day** | 19 | 24 |
| **Signal Diversity** | Limited | High |

---

## Data Source Mapping

| Ticker | Primary | Fallback |
|--------|---------|----------|
| BTC, ETH | Twelve Data | CoinGecko |
| NVDA, TSLA, AAPL, MSTR, HIMS, COIN | Twelve Data | Yahoo Finance |
| SPY, QQQ, GLD, TLT | Yahoo Finance | — |

---

## Action Items

1. **Immediate:** Update market_data_service.js with 12 tickers
2. **Today:** Test all data sources
3. **This Week:** Expand research cycles to cover full watchlist
4. **Deploy:** New dashboard with sector breakdowns

---

*Generated: July 20, 2026 23:55 CET*
*Rationale: Self-improvement — optimal watchlist based on Alpha Fund thesis + diversification*
