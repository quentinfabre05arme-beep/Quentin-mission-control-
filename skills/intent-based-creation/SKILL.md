# 🎯 Intent-Based Agent Creation

**Description:** Create agents and workflows from natural language descriptions.

## Why This Matters

2026 standard: Users shouldn't need to code. Just describe intent.

**Before:**
```javascript
// Manual skill creation
const skill = new Skill({
  name: 'btc-monitor',
  triggers: ['price > 5%'],
  actions: ['alert', 'log']
});
```

**After:**
```
You: "Alert me when BTC moves more than 5%"
Me: ✅ Agent created!
```

## How It Works

### Step 1: Parse Intent
```
Input: "Alert me when BTC moves more than 5%"
↓
Intent: {
  trigger: "price_change",
  asset: "BTC",
  threshold: "5%",
  action: "alert",
  frequency: "real-time"
}
```

### Step 2: Map to Skills
```
Intent → Required capabilities:
- Price monitoring → market_data_service
- Threshold checking → logic engine
- Alerting → message/telegram
- Logging → audit system
```

### Step 3: Generate Agent
```
Create:
- Cron job (every 5 min)
- Script (check price)
- Logic (compare to threshold)
- Action (send alert)
- Log (record event)
```

### Step 4: Deploy
```
✅ Agent "btc-alert" created
✅ Cron scheduled
✅ Monitoring active
✅ Logs configured
```

## Examples

### Example 1: Simple Alert
```
You: "Tell me when ETH hits $3000"
Me: Created ETH price monitor
     Checking every 5 minutes
     Will alert when ETH ≥ $3000
```

### Example 2: Complex Workflow
```
You: "Research biotech trends weekly and email me summary"
Me: Created multi-step agent:
     1. Research biotech (Mondays 9am)
     2. Generate summary
     3. Email to you
     4. Log completion
```

### Example 3: Conditional Logic
```
You: "Buy the dip when BTC drops 10% but only if sentiment is positive"
Me: Created conditional agent:
     IF BTC drops ≥ 10%
     AND sentiment > 0.6
     THEN alert "Buying opportunity"
     ELSE log "Conditions not met"
```

## Intent Patterns

### Triggers
```
"When [event]" → Event-based trigger
"Every [time]" → Scheduled trigger
"If [condition]" → Conditional trigger
"When I say [phrase]" → Voice trigger
```

### Actions
```
"Alert me" → Send notification
"Email me" → Send email
"Log it" → Record to file
"Create [thing]" → Generate artifact
"Update [thing]" → Modify existing
```

### Targets
```
"BTC/ETH/MSTR" → Assets
"Portfolio" → All positions
"Watchlist" → Tracked items
"Everything" → Global scope
```

## Implementation

```javascript
const intent = await intentParser.parse("Alert me when BTC moves > 5%");
// Returns structured intent object

const agent = await agentBuilder.create(intent);
// Generates agent with all required components

const deployed = await deployer.deploy(agent);
// Activates agent with cron, hooks, logging
```

## Safety Guardrails

- ✅ Ask before spending money
- ✅ Confirm before destructive actions
- ✅ Limit resource usage
- ✅ Log all creations
- ✅ Allow easy deletion

## Status
**Version:** 1.0
**Capability:** Natural language → Agent
**Safety:** Confirms before risky actions
