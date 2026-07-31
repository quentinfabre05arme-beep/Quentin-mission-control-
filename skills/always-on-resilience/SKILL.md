---
name: "always-on-resilience"
description: "Resilient self-healing system ensuring Claw never stops operating"
---

# Always-On Resilience System

**Purpose:** Ensure Claw never stops operating — self-healing, auto-restart, fault-tolerant execution.

## Core Principles

1. **No Single Point of Failure** — Every component has fallback
2. **Self-Healing** — Detect failures, fix automatically, escalate only when exhausted
3. **Persistent State** — All state survives crashes/restarts
4. **Graceful Degradation** — Reduce functionality rather than stop entirely

## Architecture

```
┌─────────────────────────────────────┐
│         MONITOR LAYER               │
│  • Heartbeat watchdog               │
│  • Process health checks            │
│  • Resource monitoring (RAM/disk)   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         ORCHESTRATION LAYER         │
│  • Cron job manager                 │
│  • Task queue                       │
│  • Priority router                  │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         EXECUTION LAYER             │
│  • Primary: OpenClaw agent        │
│  • Fallback: Windows Task Scheduler │
│  • Fallback: Shell scripts          │
│  • Fallback: Browser automation     │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         PERSISTENCE LAYER           │
│  • Memory files (MEMORY.md)         │
│  • Daily logs (memory/YYYY-MM-DD.md)│
│  • State JSONs                      │
│  • Git commits as backup            │
└─────────────────────────────────────┘
```

## Self-Healing Rules

### Rule 1: Cron Job Failure
```
IF cron_job_fails:
  1. Log failure with timestamp
  2. Retry with exponential backoff (1min, 5min, 15min)
  3. IF still failing after 3 attempts:
     - Switch to Windows Task Scheduler fallback
     - Create alert file: alerts/cron-<jobname>-failed.md
     - Notify on next heartbeat (not immediately — batch alerts)
```

### Rule 2: API Rate Limit
```
IF api_returns_429:
  1. Read Retry-After header
  2. Sleep for recommended duration
  3. Switch to fallback API source
  4. IF no fallback available:
     - Use cached data
     - Log staleness
     - Queue refresh for next cycle
```

### Rule 3: Out of Memory
```
IF ram_usage > 90%:
  1. Identify largest memory consumers
  2. Pause non-critical cron jobs
  3. Trigger garbage collection
  4. IF still critical:
     - Restart OpenClaw gateway gracefully
     - Log restart reason
     - Resume from checkpoint
```

### Rule 4: Disk Full
```
IF disk_usage > 90%:
  1. Identify largest folders
  2. Archive old logs (>30 days)
  3. Compress old memory files
  4. IF still critical:
     - Alert user with specific recommendations
     - Pause log-heavy operations
```

### Rule 5: Git Push Failure
```
IF git_push_fails:
  1. Capture exact error
  2. Try HTTPS fallback with token
  3. IF auth error:
     - Create alert: alerts/git-auth-expired.md
     - Queue changes for next successful push
     - Continue operating locally
```

## Persistent State Management

### State Files
| File | Purpose | Backup |
|------|---------|--------|
| `state/heartbeat.json` | Last heartbeat timestamp, next checks | Git commit |
| `state/cron-status.json` | Cron job health status | Git commit |
| `state/market-cache.json` | Last known good market data | Git commit |
| `state/pending-actions.json` | Actions queued during outage | Git commit |

### Recovery Protocol
```
ON_START:
  1. Read state/heartbeat.json
  2. IF last_heartbeat > 30min ago:
     - Log "Recovery from downtime"
     - Check state/pending-actions.json
     - Execute queued actions by priority
     - Run catch-up for missed cron jobs
  3. Update heartbeat timestamp
  4. Resume normal operation
```

## Windows Task Scheduler Fallback

For critical operations when OpenClaw cron fails:

```powershell
# Create persistent task that survives reboots
schtasks /create /tn "Claw-Recovery-Agent" `
  /tr "powershell -File C:\Users\quent\.openclaw\workspace\recovery\auto_restart.ps1" `
  /sc onstart /ru SYSTEM /rl HIGHEST

# Every 5 minutes health check
schtasks /create /tn "Claw-Health-Check" `
  /tr "powershell -File C:\Users\quent\.openclaw\workspace\recovery\health_check.ps1" `
  /sc minute /mo 5 /ru SYSTEM
```

## Alert Aggregation

Instead of alerting immediately (noise), batch alerts:

```
ALERT_BATCHING:
  - Collect alerts for 15 minutes
  - Deduplicate similar alerts
  - Prioritize by severity
  - Send ONE summary message
  - Include action taken + next steps
```

## Implementation Files

```
recovery/
├── auto_restart.ps1          # Self-restart logic
├── health_check.ps1          # System health monitor
├── api_fallback.js           # API failure recovery
├── memory_cleanup.ps1        # RAM/disk cleanup
├── git_recovery.ps1          # Git auth recovery
└── state/
    ├── heartbeat.json
    ├── cron-status.json
    ├── market-cache.json
    └── pending-actions.json
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Uptime | >99% |
| Recovery time | <5 minutes |
| Alerts per day | <3 (batched) |
| Failed cron catch-up rate | 100% |
| Data loss | 0% |

## Monitoring Dashboard

Track in `recovery/status.html`:
- System uptime
- Last recovery event
| Cron health (all jobs)
| API fallback usage
| Pending actions queue
| Resource usage trends

## Activation

To activate full resilience:
1. Run `recovery/setup.ps1` (creates tasks, state files)
2. Verify: `recovery/health_check.ps1`
3. Test: Kill a cron job, verify auto-restart
4. Done — system self-manages from here

---
**Status:** Proposed | **Risk:** Low | **Cost:** €0
