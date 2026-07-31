# Autonomy Core Engine v1.0

## Overview
Master intelligence controller for persistent autonomous operations. Runs 4 principles every 15 minutes in silent mode.

## The 4 Principles

### 1. EFFICIENCY — Optimize waste, maximize output
- Detects stale cron jobs
- Identifies large log files
- Archives old memory files (>7 days)
- Finds duplicate scripts
- **Status:** ✅ Active

### 2. INTELLIGENCE — Learn patterns, make smart decisions
- Analyzes error patterns
- Learns from successes
- Makes decisions based on patterns
- Proposes skill creation for recurring issues
- **Status:** ✅ Active

### 3. PERSISTENCE — Never stop, always recover
- Checks critical file health
- Auto-resolves stale errors
- Tracks uptime
- Monitors system continuity
- **Status:** ✅ Active

### 4. SELF-IMPROVEMENT — Constant learning and optimization
- Evaluates performance metrics
- Identifies declining efficiency
- Proposes improvements
- Tracks optimization count
- **Status:** ✅ Active

## Files
- `engine.js` — Main engine (Node.js)
- `engine_state.json` — Persistent state
- `engine.log` — Operation log
- `run_engine.ps1` — PowerShell runner
- `run_engine.cmd` — Windows batch runner

## Task Scheduler
- **Name:** Autonomy-Core-Engine
- **Frequency:** Every 15 minutes
- **Command:** `run_engine.cmd`
- **Status:** Active

## Silent Operation
The engine runs silently and does NOT notify the user unless:
- Critical failure after 5 attempts
- Financial transaction required
- External action (X post, email) requested

## State Tracking
The engine maintains persistent state including:
- Total cycles completed
- Error history (last 50)
- Metrics per principle
- Active missions
- Improvements proposed

## Next Execution
Check with: `schtasks /query /tn "Autonomy-Core-Engine"`

## Manual Execution
```bash
# Single cycle
node missions/autonomy_core/engine.js

# View logs
cat missions/autonomy_core/engine.log

# View state
node -e "console.log(JSON.stringify(require('./missions/autonomy_core/engine_state.json'), null, 2))"
```

## Version History
- v1.0.0 (Jul 23, 2026) — Initial deployment
