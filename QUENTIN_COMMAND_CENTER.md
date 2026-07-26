# 📊 QUENTIN'S COMMAND CENTER

## 🎯 Quick Status Commands

```powershell
# View all goals status
node missions/agents/central_orchestrator.js status

# View DSCG progress
node missions/dscg_study/dscg_study.js report

# View paper trading portfolio
node missions/paper_trader/paper_trader.js report

# View revenue
node missions/revenue_tracker/revenue_tracker.js --json

# View product pipeline
node missions/product_pipeline/product_pipeline.js status

# Check risk levels
node skills/risk_manager/risk_manager.js --portfolio
```

## 📈 Real-Time Tracking Files

| File | What It Shows | Updated |
|------|---------------|---------|
| `memory/global_memory.json` | Overall stats | Every interaction |
| `memory/session_stats.json` | Current session | Every 10s |
| `memory/update_log.jsonl` | All updates | Continuously |
| `memory/dscg_progress.json` | DSCG progress | After study |
| `memory/trades/*.jsonl` | All trades | After trade |
| `memory/revenue.json` | Revenue data | After sale |

## 🖥️ Visual Dashboard

**Open in browser:**
```
C:\Users\quent\.openclaw\workspace\mission_control\quentin_dashboard.html
```

**Features:**
- ✅ Real-time metrics
- ✅ Progress bars
- ✅ System status
- ✅ Auto-updates every minute
- ✅ All 5 goals visible

## 📱 Quick Commands by Goal

### 🤖 Best AI Agent
```powershell
node missions/self_improvement/real_improver.js
node lib/universal_memory.js
```

### 📚 Learning Library
```powershell
node skills/content-extractor/content_extractor.js --help
# (learning_tracker pending)
```

### 💰 Revenue
```powershell
node missions/revenue_tracker/revenue_tracker.js --json
node missions/product_pipeline/product_pipeline.js report
```

### 🎓 DSCG
```powershell
node missions/dscg_study/dscg_study.js suggest    # What to study next
node missions/dscg_study/dscg_study.js report   # Full progress
node skills/exam-practice/exam_practice.js      # Practice exam
node skills/french-mode/french_mode.js          # French mode
```

### 📈 Trading
```powershell
node missions/paper_trader/paper_trader.js status   # Portfolio
node skills/risk_manager/risk_manager.js --portfolio # Risk check
node missions/paper_trader/paper_trader.js test      # Run test trades
```

## 🔄 Auto-Update Setup

**Dashboard refreshes:**
- Every 60 seconds automatically
- When you run any command
- When subagents complete

**To manually refresh:**
```powershell
# Refresh all data
node missions/agents/central_orchestrator.js refresh
```

## 📊 Visual Indicators

| Symbol | Meaning |
|--------|---------|
| 🟢 | Active/Complete |
| 🟡 | Building/In Progress |
| 🔴 | Error/Blocked |
| ⏳ | Pending/Queued |
| ✅ | Test Passed |

## 🚀 One-Line Status Check

```powershell
# Full system status in one command
node -e "const fs=require('fs'); console.log('Systems:', fs.readdirSync('missions').length, 'missions,', fs.readdirSync('skills').length, 'skills');"
```

**All tracking is automatic. Just open the dashboard or run any command.** 🎯
