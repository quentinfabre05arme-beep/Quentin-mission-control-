# Auto-Commit Configuration
# Updated: 2026-07-25 18:11
# Status: ENABLED — No approval required

## Rules

### Auto-Commit WITHOUT asking:
- ✅ Internal file changes (skills, configs, memory, missions)
- ✅ Daily maintenance sweeps
- ✅ Dashboard updates
- ✅ Opportunity scans
- ✅ Research data
- ✅ JSON state files
- ✅ HTML/CSS updates
- ✅ Documentation updates

### Still ASK before committing:
- ❌ API keys or secrets (check .env files)
- ❌ Credential files
- ❌ External-facing config changes (URLs, webhooks)
- ❌ Breaking changes to existing workflows
- ❌ Large binary files (>1MB)

## Safety Checks (always run before commit)
1. Check for secrets in diff: `git diff --name-only | grep -E '\.(env|key|secret|token|password)'`
2. Verify no API keys in plaintext
3. Ensure .gitignore is up to date
4. Skip if >50 files changed (flag for review)

## Command
```powershell
git add -A; git commit -m "auto: $(date) — $(git status --short | wc -l) files"; git push
```

## Cron Job
Name: `auto-commit`
Schedule: Every 2 hours
Action: Auto-commit pending changes (with safety checks)
