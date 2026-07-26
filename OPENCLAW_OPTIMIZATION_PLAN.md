# OpenClaw Autonomous Optimization Plan
**Created:** July 26, 2026
**Status:** Phase 1 Complete (Config Fixed)

---

## ✅ COMPLETED: Critical Fixes

### 1. Config Validation Error — FIXED
- Removed invalid `"label"` property from Telegram group config
- Config now validates successfully

### 2. Doctor Audit Results
**Issues Found:**
- ✅ 68 orphan transcript files (can archive)
- ✅ 15 cron jobs using old model (kimi-k2.5:cloud)
- ✅ Plaintext secrets in config (security risk)
- ✅ 20 blocked TaskFlow jobs (orphaned tasks)
- ✅ TOOLS.md exceeds bootstrap limit (28KB > 20KB)
- ✅ Memory search disabled (no OpenAI API key)
- ✅ 28 skills eligible, 0 enabled

---

## 🎯 PHASE 2: IMMEDIATE IMPROVEMENTS (Do Now)

### 2.1 Move Workspace to D: Drive
```powershell
# Stop OpenClaw first
# Then run as admin:
Remove-Item C:\Users\quent\.openclaw -Recurse -Force
cmd /c mklink /J "C:\Users\quent\.openclaw" "D:\.openclaw"
# Restart OpenClaw
```
**Space freed:** ~3 GB on C:

### 2.2 Fix Cron Jobs
**Problem:** 31 jobs use outdated model `kimi-k2.5:cloud`
**Fix:** Update all to `kimi-k2.6`
```bash
openclaw cron list --json | jq '.[] | select(.model == "ollama-cloud/kimi-k2.5:cloud") | .id'
# Then update each
```

### 2.3 Clean Orphan Files
```bash
openclaw doctor --fix  # Already ran, may need --yes
```

### 2.4 Cancel Blocked TaskFlows
```bash
# Show all blocked
openclaw tasks flow list --status blocked

# Cancel them
openclaw tasks flow cancel 845e2835-9f7f-491b-95dc-c6fde7a365db
# ... (20 total)
```

---

## 🚀 PHASE 3: AUTONOMY ENHANCEMENTS

### 3.1 Enable Essential Skills

Create optimized config patch:
```json5
{
  skills: {
    entries: {
      github: { enabled: true },
      gog: { enabled: true },
      summarize: { enabled: true },
      "coding-agent": { enabled: true },
      obsidian: { enabled: true },
      sag: { enabled: true }
    }
  }
}
```

### 3.2 Configure Model Cost Tracking
```json5
{
  models: {
    pricing: { enabled: true }
  }
}
```

### 3.3 Fix Memory Search
**Option A:** Set OpenAI API key
```bash
setx OPENAI_API_KEY "sk-your-key-here"
```

**Option B:** Disable if not needed
```json5
{
  agents: {
    defaults: {
      memorySearch: { enabled: false }
    }
  }
}
```

### 3.4 Optimize Bootstrap (Reduce Token Waste)
```json5
{
  agents: {
    defaults: {
      bootstrapMaxChars: 15000,
      bootstrapTotalMaxChars: 50000
    }
  }
}
```

### 3.5 Re-Essential Cron Jobs
**Enable these 8 jobs:**
1. `memory-maintenance` — every 2h
2. `auto-commit-pending` — every 15m  
3. `fund-research-cycle` — every 4h
4. `alternative-data-fetch` — every 6h
5. `swing-portfolio-monitor` — every 1h
6. `research-morning` — 08:00 daily
7. `research-evening` — 20:00 daily
8. `dashboard-autonomous-improvement` — every 6h

**Delete these 44 unused jobs:**
- All "error" status jobs
- All "ok" but disabled jobs
- All "null" lastRunStatus jobs

---

## 🔧 PHASE 4: ADVANCED AUTONOMY

### 4.1 Multi-Agent Setup
Create specialized agents for different tasks:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        workspace: "~/.openclaw/workspace"
      },
      {
        id: "trader",
        workspace: "~/.openclaw/workspace-trader",
        skills: ["fact-checker", "error-handler"],
        heartbeat: { every: "1h", target: "none" }
      },
      {
        id: "content",
        workspace: "~/.openclaw/workspace-content", 
        skills: ["x-automation-setup", "meme-maker"],
        heartbeat: { every: "4h", target: "none" }
      },
      {
        id: "sysop",
        workspace: "~/.openclaw/workspace-sysop",
        skills: ["healthcheck", "cron-optimizer"],
        heartbeat: { every: "6h", target: "none" }
      }
    ]
  }
}
```

### 4.2 MCP Integration
Add MCP servers for external tools:
```json5
{
  mcp: {
    servers: {
      fetch: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"]
      },
      brave: {
        command: "npx", 
        args: ["-y", "@modelcontextprotocol/server-brave-search"]
      }
    }
  }
}
```

### 4.3 Webhook Integration
```json5
{
  hooks: {
    enabled: true,
    token: "${HOOKS_TOKEN}",
    mappings: [
      {
        match: { path: "tradingview" },
        action: "agent",
        agentId: "trader"
      },
      {
        match: { path: "github" },
        action: "agent",
        agentId: "main"
      }
    ]
  }
}
```

---

## 📊 SUCCESS METRICS

| Metric | Before | After | How to Check |
|--------|--------|-------|--------------|
| Config valid | ❌ False | ✅ True | `openclaw doctor` |
| Active cron jobs | 2/52 | 8/8 | `openclaw cron list` |
| Skills enabled | 0 | 6+ | `openclaw skills list` |
| Orphan files | 68 | 0 | `openclaw doctor` |
| Blocked tasks | 20 | 0 | `openclaw tasks flow list` |
| Bootstrap size | 61KB | <50KB | `openclaw doctor` |
| C: drive space | Full | +3GB | File Explorer |

---

## ⚡ QUICK WINS (5 Minutes Each)

1. **Fix model references in cron jobs**
2. **Cancel blocked TaskFlows**
3. **Enable 6 essential skills**
4. **Set bootstrap limits**
5. **Re-enable 8 cron jobs**

---

## 🎯 ULTIMATE GOAL

**Full Autonomous Operation:**
- Self-monitoring (health checks)
- Self-improving (research & implement)
- Self-healing (error recovery)
- Revenue-generating (POD, X, newsletter)
- Cost-optimized (token tracking)

**Timeline:** 2 weeks to full autonomy

---

*Plan created by Claw*
*Execute Phase 2 to begin*
