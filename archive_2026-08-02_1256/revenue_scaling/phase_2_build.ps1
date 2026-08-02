<#
.SYNOPSIS
    Phase 2 Build — Medium-term revenue automation (Month 1)
    Builds SaaS API, agency outreach system, and Alpha Fund live deployment prep
.DESCRIPTION
    Phase 2 focuses on building scalable systems that generate recurring revenue:
    - Micro SaaS "Alpha Signals" with auth and billing
    - Content agency client acquisition system
    - Alpha Fund live trading preparation
.NOTES
    Estimated effort: 40 hours over 4 weeks
    Expected revenue: €2,500-4,000/month by end of Month 1
#>

$ErrorActionPreference = "Stop"
$Workspace = "C:\Users\quent\.openclaw\workspace"
$RevenueDir = "$Workspace\revenue_scaling"
$Phase2Dir = "$RevenueDir\phase_2"

New-Item -ItemType Directory -Force -Path $Phase2Dir | Out-Null

Write-Host "🏗️ PHASE 2 BUILD: Medium-Term Revenue Systems" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Target: €2,500-4,000/month by end of Month 1" -ForegroundColor Yellow
Write-Host ""

# ===== 1. MICRO SaaS API PACKAGE =====
Write-Host "🔧 Building Micro SaaS: Alpha Signals API" -ForegroundColor Green

$SaaSDir = "$Phase2Dir\alpha_signals_saas"
New-Item -ItemType Directory -Force -Path $SaaSDir | Out-Null

# API Package Structure
$SaaSReadme = @"
# Alpha Signals SaaS

## Overview
Package existing research infrastructure as subscription API service.

## Architecture
```
Client → API Gateway → Auth (Supabase) → Rate Limit → Research Engine → Response
                                          ↓
                                    Stripe Billing
```

## Endpoints (Planned)
- GET /api/v1/market/snapshot — Daily market brief
- GET /api/v1/signals/{asset} — Composite scoring
- GET /api/v1/alerts — Active alerts and anomalies
- GET /api/v1/technical/{asset} — TA indicators
- GET /api/v1/sentiment/{asset} — Sentiment analysis
- GET /api/v1/whale — Whale movement detection

## Pricing Tiers
- Free: 3-day delayed, 10 requests/day
- Pro €49/mo: Real-time, 1000 requests/day
- Institutional €299/mo: API access, unlimited, white-label

## Tech Stack
- Vercel Serverless Functions (hosting)
- Supabase Auth (authentication)
- Stripe (billing)
- Twelve Data + CoinGecko (market data)
- Serper.dev (news/sentiment)

## Build Steps
1. Package research scripts into API endpoints
2. Add JWT auth middleware
3. Implement rate limiting per tier
4. Stripe webhook integration
5. Landing page + waitlist
6. Product Hunt launch

## Revenue Projection
- Month 1: 5-10 beta users (free)
- Month 2: 10-20 paid @ €49 = €490-980
- Month 3: 30-50 paid + 1 institutional = €1,500-2,500
- Month 6: 100+ paid + 2-3 institutional = €5,000+
"@

$SaaSReadme | Out-File -FilePath "$SaaSDir\README.md" -Encoding UTF8

# Create API wrapper template
$ApiTemplate = @"
/**
 * Alpha Signals API — Serverless Function Template
 * Deploy to Vercel or Netlify Functions
 */

const { createClient } = require('@supabase/supabase-js');

// Rate limiting (in-memory, use Redis in production)
const rateLimits = new Map();

const TIERS = {
  free: { requestsPerDay: 10, delayed: true },
  pro: { requestsPerDay: 1000, delayed: false },
  institutional: { requestsPerDay: 100000, delayed: false }
};

function checkRateLimit(userId, tier) {
  const limit = TIERS[tier]?.requestsPerDay || TIERS.free.requestsPerDay;
  const key = `${userId}:${new Date().toISOString().split('T')[0]}`;
  const current = rateLimits.get(key) || 0;
  
  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  rateLimits.set(key, current + 1);
  return { allowed: true, remaining: limit - current - 1 };
}

// Main handler
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Auth check (simplified — use Supabase auth in production)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Determine tier from API key (simplified)
  const tier = apiKey.startsWith('inst_') ? 'institutional' : 
               apiKey.startsWith('pro_') ? 'pro' : 'free';
  
  // Rate limit check
  const rateCheck = checkRateLimit(apiKey, tier);
  if (!rateCheck.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      tier: tier,
      limit: TIERS[tier].requestsPerDay
    });
  }
  
  // Route to handler
  const { path } = req.query;
  
  try {
    switch (path) {
      case 'market/snapshot':
        // TODO: Integrate with existing research scripts
        return res.json({
          status: 'success',
          tier: tier,
          data: {
            timestamp: new Date().toISOString(),
            note: 'Integrate with market_data_service.js'
          },
          remaining: rateCheck.remaining
        });
        
      case 'signals':
        // TODO: Integrate with enhanced_research.js
        return res.json({
          status: 'success',
          tier: tier,
          data: {
            note: 'Integrate with enhanced_research.js composite scoring'
          },
          remaining: rateCheck.remaining
        });
        
      default:
        return res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
"@

$ApiTemplate | Out-File -FilePath "$SaaSDir\api_handler.js" -Encoding UTF8

Write-Host "  ✅ SaaS package created: $SaaSDir"
Write-Host "  📁 Files: README.md, api_handler.js"
Write-Host "  ⏱️  Build time: 8 hours (auth + billing + landing)"
Write-Host "  💰 Revenue potential: €1,000-5,000/month"
Write-Host ""

# ===== 2. CONTENT AGENCY OUTREACH SYSTEM =====
Write-Host "🔧 Building Content Agency System" -ForegroundColor Green

$AgencyDir = "$Phase2Dir\content_agency"
New-Item -ItemType Directory -Force -Path $AgencyDir | Out-Null

$AgencySystem = @"
# Content Agency — Client Acquisition & Delivery System

## Services & Pricing

### 1. Daily Market Brief Package
**Price:** €199/month
**Includes:**
- Automated daily brief (generated from existing pipeline)
- 3 X posts per day (auto-scheduled)
- Weekly performance report
- Delivery: Email + shared Notion page

### 2. Weekly Deep-Dive Package
**Price:** €499/month
**Includes:**
- Weekly 2000-word research report
- Infographic generation
- X thread (5-7 posts)
- Custom asset coverage (up to 5 assets)
- Delivery: PDF + social media package

### 3. X Ghostwriting Retainer
**Price:** €499-799/month
**Includes:**
- 3-5 original posts/day
- 10-20 strategic replies to high-value accounts
- 1 weekly thread
- Monthly content calendar
- Engagement reporting

### 4. Custom Research Report
**Price:** €99-299 one-off
**Includes:**
- 5-10 page analysis on any asset/topic
- Technical analysis + sentiment + on-chain data
- Delivered in 48 hours

## Client Acquisition Pipeline

### Step 1: Prospect Identification (Weekly)
- Scrape X for investment/crypto/fintech accounts
- Filter: 1K-50K followers, low engagement = content hungry
- Extract: Handle, follower count, niche, contact method

### Step 2: Outreach Templates

**Template A — Direct DM (X):**
```
Hey [Name], been following your [niche] content. 

I run an AI-powered research service that generates daily market briefs 
and X threads for investment creators. 

We handle the research so you can focus on building your brand.

Interested in a free sample brief? No strings attached.
```

**Template B — LinkedIn Connection:**
```
Hi [Name], I noticed you're building in the [fintech/crypto] space.

I help creators and newsletters scale their content output with 
AI-powered research and daily briefs.

Would you be open to a 10-minute call to see if there's a fit?
```

**Template C — Reddit (r/algotrading, r/passive_income):**
```
[OFFER] AI-Powered Market Research for Content Creators

I've built an automated research pipeline that generates:
- Daily market briefs with technical analysis
- Whale movement alerts
- Sentiment scoring
- X-ready threads

Looking for 3 beta clients at €199/mo (50% off regular €399).

DM me if interested.
```

### Step 3: Sales Process
1. Free sample deliverable (use existing research)
2. 15-minute discovery call
3. Proposal with 3 pricing tiers
4. Stripe subscription setup
5. Onboarding (Notion template, delivery schedule)

## Delivery Automation

### Tools
- **Content Generation:** Existing newsletter_generator.js pipeline
- **Scheduling:** Buffer or native X scheduling
- **Client Portal:** Notion page with embedded reports
- **Billing:** Stripe subscriptions
- **Communication:** Slack Connect or email

### Weekly Workflow (Per Client)
- Monday: Generate weekly content calendar
- Tuesday-Friday: Daily brief generation + X posts
- Sunday: Weekly report + next week planning
- Monthly: Retrospective + pricing review

## Revenue Projections

| Month | Clients | Avg Price | Monthly Revenue |
|-------|---------|-----------|-----------------|
| 1     | 1-2     | €300      | €300-600        |
| 2     | 3-4     | €350      | €1,050-1,400    |
| 3     | 5-7     | €400      | €2,000-2,800    |
| 6     | 8-12    | €450      | €3,600-5,400    |

## Competitive Advantage
- **Cost:** Near-zero marginal cost (automation does 90%)
- **Speed:** Deliver in hours vs days (competitors)
- **Data:** Unique composite scoring + whale signals
- **Price:** Undercut competitors by 50%+
"@

$AgencySystem | Out-File -FilePath "$AgencyDir\AGENCY_SYSTEM.md" -Encoding UTF8

Write-Host "  ✅ Agency system created: $AgencyDir"
Write-Host "  📁 File: AGENCY_SYSTEM.md"
Write-Host "  ⏱️  Build time: 4 hours (templates + outreach system)"
Write-Host "  💰 Revenue potential: €800-3,000/month"
Write-Host ""

# ===== 3. ALPHA FUND LIVE DEPLOYMENT PREP =====
Write-Host "🔧 Alpha Fund Live Trading Prep" -ForegroundColor Green

$AlphaDir = "$Phase2Dir\alpha_fund_live"
New-Item -ItemType Directory -Force -Path $AlphaDir | Out-Null

$AlphaPlan = @"
# Alpha Fund — Live Trading Deployment Plan

## Prerequisites Checklist

### Paper Trading Validation (30+ days)
- [ ] Max drawdown < 15%
- [ ] Sharpe ratio > 1.0
- [ ] Win rate > 55%
- [ ] Average winner > average loser
- [ ] Consistent signal generation across market conditions

### Risk Management Framework
- [ ] Position sizing: Max 5% per asset, max 20% total portfolio
- [ ] Stop losses: 8% hard stop per position
- [ ] Rebalancing: Weekly or on signal change
- [ ] Cash reserve: 30% minimum for opportunities

### Brokerage Setup
- [ ] Interactive Brokers or equivalent (lowest fees)
- [ ] API access enabled
- [ ] Paper trading account validated
- [ ] Live account funded (€10,000 minimum)

## Deployment Phases

### Phase A: Small Live Test (Week 1-2)
- Deploy 10% of capital (€1,000)
- Same signals as paper trading
- Daily monitoring + weekly review
- Document all trades with rationale

### Phase B: Scale to Full (Week 3-4)
- If Phase A successful, deploy remaining 90%
- Maintain same risk parameters
- Begin compounding (reinvest profits)

### Phase C: Optimization (Month 2+)
- A/B test signal weights
- Add new assets based on research
- Consider leverage (max 2x on high-conviction)

## Revenue Projection

Assumptions:
- Starting capital: €10,000
- Monthly return target: 5-10% (conservative)
- Compounding: Monthly

| Month | Capital | Monthly Return | Cumulative |
|-------|---------|----------------|------------|
| 1     | €10,000 | €500-1,000     | €10,500-11,000 |
| 3     | €11,500 | €575-1,150     | €12,075-12,650 |
| 6     | €13,400 | €670-1,340     | €14,070-14,740 |
| 12    | €18,000 | €900-1,800     | €18,900-19,800 |

**Monthly Revenue:** €500-1,000 (Month 1) → €900-1,800 (Month 12)

## Risk Warning
- Past performance ≠ future results
- Crypto/stock markets are volatile
- Only risk capital you can afford to lose
- Maintain stop losses and position limits
- Document everything for learning

## Automation
- Signal generation: Already automated (enhanced_research.js)
- Alert delivery: Email + X DM to self
- Position tracking: Spreadsheet or portfolio tracker
- Reporting: Weekly P&L + performance metrics
"@

$AlphaPlan | Out-File -FilePath "$AlphaDir\LIVE_DEPLOYMENT.md" -Encoding UTF8

Write-Host "  ✅ Alpha Fund prep created: $AlphaDir"
Write-Host "  📁 File: LIVE_DEPLOYMENT.md"
Write-Host "  ⏱️  Prep time: 2 hours (validation + setup)"
Write-Host "  💰 Revenue potential: €500-1,800/month (compounding)"
Write-Host ""

# ===== PHASE 2 SUMMARY =====
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ PHASE 2 BUILD COMPLETE" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "DELIVERABLES:" -ForegroundColor Yellow
Write-Host "  🔧 Alpha Signals SaaS (api_handler.js + README)"
Write-Host "  🔧 Content Agency System (outreach templates + pricing)"
Write-Host "  🔧 Alpha Fund Live Deployment Plan"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Build SaaS auth + billing (8 hours)"
Write-Host "  2. Create agency landing page (2 hours)"
Write-Host "  3. Begin prospect outreach (ongoing)"
Write-Host "  4. Validate paper trading results (if 30+ days)"
Write-Host "  5. Deploy Alpha Fund Phase A (if validated)"
Write-Host ""
Write-Host "COMBINED REVENUE TARGET: €2,500-4,000/month by Month 1"
Write-Host ""
Write-Host "Files created in: $Phase2Dir" -ForegroundColor Gray
