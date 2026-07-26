# 🏥 System Health Monitor Skill

**Description:** Monitor system health proactively, alert before failures, auto-fix common issues.

## Checks

### 1. Disk Space
- Alert if disk > 85% full
- Auto-clean logs/tmp if > 90%
- Check daily

### 2. Memory
- Alert if memory > 90% used
- Suggest process to kill
- Check hourly

### 3. API Rate Limits
- Track Twelve Data calls (800/day)
- Track Serper calls (2500/month)
- Alert at 80% usage

### 4. Cron Jobs
- Check all cron jobs running
- Alert on failures
- Auto-restart critical jobs

### 5. Data Freshness
- Market data < 1 hour old
- Portfolio synced
- Research data current

## Auto-Fix Actions
- Restart failed cron jobs
- Clean logs > 7 days old
- Archive old sessions
- Clear temp files

## Alerts
```
🚨 System Health Alert
━━━━━━━━━━━━━━━━━━━━━━━
Disk: 87% → Cleaning old logs...
Memory: 92% → Suggest closing Chrome tabs
API: Twelve Data 85% used (680/800)
Cron: 1 job failed → Auto-restarted
```
