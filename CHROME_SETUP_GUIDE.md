# Chrome Automation Setup for X/Twitter

## Current Situation
Chrome is running but WITHOUT remote debugging enabled, which means OpenClaw can't attach to your logged-in session.

## Solution: Two Options

### Option A: Restart Chrome with Remote Debugging (Recommended)

**Step 1:** Close all Chrome windows
**Step 2:** Relaunch Chrome with this command:

```powershell
# Close Chrome first
Stop-Process -Name chrome -Force

# Relaunch with remote debugging
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Step 3:** Keep Chrome open, log into X if not already logged in
**Step 4:** In OpenClaw, run: `browser action=open profile=user targetUrl=https://x.com`

### Option B: Use OpenClaw-Managed Browser (Isolated)

Use the built-in `openclaw` profile — but you'll need to log into X again in that browser instance.

```javascript
// OpenClaw launches its own Chrome
browser action=open profile=openclaw targetUrl=https://x.com
// Then manually log in to X
```

## What I Can Do Once Connected

Once Chrome is accessible with your login:

1. **Navigate to X** → Post tweets, check notifications, reply to mentions
2. **Navigate to any site** → Extract data, fill forms, download files
3. **Post on your behalf** → With your approval queue system
4. **Monitor feeds** → Check market sentiment, news alerts
5. **Screenshot dashboards** → Capture charts for analysis

## Security Note

Remote debugging gives full browser control. Only enable when:
- You're at your PC (not remote)
- You trust the automation scripts
- You review before any external posts

## Recommended Workflow

1. Start Chrome with remote debugging (manual step — I can't do this without closing your browser)
2. I'll detect and attach automatically
3. Use `[BROWSE:X]` tag in tasks to trigger browser actions
4. I'll confirm before posting anything externally

---
*Ready to implement once Chrome remote debugging is enabled.*
