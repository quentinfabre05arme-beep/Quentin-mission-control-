# OpenClaw Monetization System - Quick Start Guide
## Get Revenue Flowing in 5 Minutes

---

## Step 1: Initialize (30 seconds)

```bash
cd mission_control/monetization

# Create required directories
mkdir -p data logs reports
```

## Step 2: Configure (1 minute)

Edit `infrastructure/system_config.json`:

```json
{
  "revenue_streams": {
    "research_reports": { "enabled": true },
    "trading_signals": { "enabled": true }
  }
}
```

## Step 3: Launch (30 seconds)

```bash
# Start the complete system
node scripts/startup.js
```

You'll see:
```
╔════════════════════════════════════════════════════════════╗
║     OpenClaw Revenue Generation System v1.0                ║
║     Autonomous Revenue Infrastructure                      ║
╚════════════════════════════════════════════════════════════╝

[STARTUP] Ensuring infrastructure...
  ✅ Infrastructure ready
[STARTUP] Initializing Revenue Orchestrator...
  ✅ Orchestrator ready
[STARTUP] Initializing Subscription Manager...
  ✅ Subscription Manager ready
     📋 Pricing tiers: Basic ($29), Pro ($99), Enterprise ($499)
[STARTUP] Initializing Research Automation...
  ✅ Research Engine ready
     📊 Tracking: BTC, ETH, MSTR, HIMS
[STARTUP] Initializing API Server...
  ✅ API Server ready
     🌐 Port: 3000

✅ Revenue System fully operational
```

## Step 4: Verify (1 minute)

```bash
# Check system health
curl http://localhost:3000/health

# View metrics
cat data/metrics.json

# Check revenue tracking
cat data/revenue_events.json
```

## Step 5: Start Generating Revenue (2 minutes)

### Option A: Manual Research Report

```javascript
const ResearchAutomation = require('./scripts/research_automation');

const research = new ResearchAutomation();

// Generate report for all assets
const report = await research.generateDailyReport();

// Report saved to: reports/daily/report_2026-07-25.json
```

### Option B: Start Continuous Operation

```javascript
// Research runs automatically every 4 hours
research.startScheduledResearch();

// System now runs 24/7 autonomously
```

### Option C: Create First Customer

```javascript
const SubscriptionManager = require('./scripts/subscription_manager');

const manager = new SubscriptionManager();

// Create customer
const customer = await manager.createSubscriber({
  email: 'first@customer.com',
  name: 'First Customer'
});

// Subscribe to Pro tier ($99/month)
const subscription = await manager.createSubscription(
  customer.id,
  'pro'
);

// Activate
await manager.activateSubscription(subscription.id);

// Revenue: $99/month committed
```

## Revenue Targets

| Phase | Timeline | Target | Action |
|-------|----------|--------|--------|
| Foundation | Week 1 | $500/mo | Launch research reports |
| Growth | Month 2 | $3,000/mo | Add trading signals |
| Scale | Month 4 | $8,000/mo | Launch API products |
| Expansion | Month 8 | $25,000/mo | Enterprise clients |

## Daily Operations

The system runs autonomously:

- **06:00 UTC**: Generate daily research reports
- **Every 4 hours**: Update technical analysis
- **Every 15 minutes**: Check trading signals
- **Daily**: Process billing and renewals
- **Continuous**: Monitor health and self-heal

## Key Files

| File | Purpose |
|------|---------|
| `README.md` | Full documentation |
| `scripts/startup.js` | Launch entire system |
| `scripts/revenue_orchestrator.js` | Central command |
| `scripts/subscription_manager.js` | Billing & customers |
| `scripts/research_automation.js` | Research engine |
| `scripts/api_server.js` | Data API |
| `data/metrics.json` | Revenue tracking |
| `logs/` | Operation logs |

## Next Steps

1. **Review Strategy**: Read `revenue_streams/REVENUE_STRATEGY.md`
2. **Customize Pricing**: Edit `infrastructure/system_config.json`
3. **Add Assets**: Update tracked symbols in config
4. **Launch Marketing**: Share research reports on social media
5. **Get First Customer**: Use your network to find beta testers

## Troubleshooting

**System won't start?**
```bash
# Check Node.js version (need 18+)
node --version

# Install dependencies if needed
npm install

# Check port availability
lsof -i :3000
```

**No revenue showing?**
```bash
# Check if streams are enabled
cat data/system_config.json

# Verify subscriber data exists
cat data/subscribers.json
```

**Research not generating?**
```bash
# Check if existing research scripts exist
ls ../enhanced_research.js

# Run manually to see errors
node ../enhanced_research.js BTC --json
```

## Support

- Full docs: `README.md`
- Strategy: `revenue_streams/REVENUE_STRATEGY.md`
- Architecture: `automation/AUTOMATION_ARCHITECTURE.md`
- Roadmap: `roadmap/IMPLEMENTATION_ROADMAP.md`

---

**Ready to generate revenue? Run:** `node scripts/startup.js`
