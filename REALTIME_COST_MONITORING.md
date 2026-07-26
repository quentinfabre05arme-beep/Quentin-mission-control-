:CONTENT
# 💰 Real-Time API Usage Monitoring

**Date:** 2026-07-26 19:13
**Status:** 🟢 Active

## What Was Built

### 1. Usage Tracker (`usage_tracker.js`)
**Purpose:** Track every API request and calculate costs in real-time
**Features:**
- Tracks by model, hour, and total
- Calculates costs based on actual pricing
- Persists data to disk
- Simulates usage for testing

### 2. Real-Time Dashboard (`realtime_dashboard.ps1`)
**Purpose:** Live updating dashboard showing API costs
**Features:**
- Refreshes every 5 seconds
- Shows daily budget vs actual spend
- Top 5 models by cost
- Status indicators (Healthy/Warning/Critical)
- ASCII art display

## How to Use

### Quick Dashboard (One-time)
```bash
cd missions/cost_monitor
node usage_tracker.js dashboard
```

### Live Dashboard (Continuous)
```powershell
cd missions/cost_monitor
.\realtime_dashboard.ps1
```

### Track a Request
```bash
# Track actual API call
node usage_tracker.js track "ollama-cloud/kimi-k2.6" 1500

# Track with input/output tokens
node usage_tracker.js track "ollama-cloud/qwen3.5:0.8b" 500
```

### Simulate Usage (for testing)
```bash
# Simulate 50 random requests
node usage_tracker.js simulate 50
```

## Cost Structure

| Model | Cost per 1K tokens |
|-------|-------------------|
| kimi-k2.6 | $0.008 |
| kimi-k2.7-code | $0.008 |
| deepseek-v4-pro | $0.006 |
| glm-5.1 | $0.008 |
| qwen3.6:35b | $0.003 |
| gemma4:31b | $0.003 |
| qwen3-vl:8b | $0.003 |
| nomic-embed-text | $0.0005 |
| qwen3.5:0.8b | $0.001 |

## Budget Alerts

| Usage | Status | Action |
|-------|--------|--------|
| < 50% | ✅ Healthy | Continue |
| 50-75% | ⚠️ Elevated | Monitor closely |
| 75-90% | 🟡 Warning | Switch to cheaper models |
| > 90% | 🔴 Critical | Stop non-essential tasks |

## Files Created

| File | Purpose |
|------|---------|
| `usage_tracker.js` | Core tracking logic |
| `realtime_dashboard.ps1` | Live dashboard |
| `usage_log.json` | Persistent data storage |

## Example Output

```json
{
  "timestamp": "2026-07-26T19:12:57.523Z",
  "status": "✅ HEALTHY",
  "dailyBudget": 2.67,
  "todaySpent": "0.1339",
  "remaining": "2.5361",
  "percentUsed": "5.0%",
  "totalSpent": "0.1339",
  "totalRequests": 20,
  "estimatedMonthly": "4.02"
}
```

## Next Steps

1. **Run dashboard** - See live costs
2. **Integrate** - Add tracking to all workflows
3. **Set alerts** - Notify when approaching budget
4. **Optimize** - Switch models based on usage

**You now have real-time visibility into all API costs!**
