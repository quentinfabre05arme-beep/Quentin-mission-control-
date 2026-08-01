# Chrome Remote Debugging Setup - Quick Reference

## What You Need to Do (One-Time Setup)

### Method 1: PowerShell (Recommended)
```powershell
# Close Chrome first
Stop-Process -Name chrome -Force

# Relaunch with debugging
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### Method 2: Double-Click Launcher
I've created `Launch-Chrome-Debug.bat` in your workspace. Just double-click it.

### Method 3: Modify Chrome Shortcut (Permanent)
1. Right-click your Chrome shortcut → Properties
2. In "Target" field, add ` --remote-debugging-port=9222` at the end
3. Example: `C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`
4. Click OK

## What This Enables

Once Chrome is running with remote debugging, I can:

### X/Twitter Automation
- Post tweets on your behalf (with your approval)
- Check notifications and DMs
- Reply to mentions
- Monitor your feed for keywords

### General Browser Automation
- Navigate any website using your logged-in session
- Extract data from pages
- Fill forms automatically
- Take screenshots of dashboards/charts
- Download reports and files
- Multi-tab research (open 10 tabs, extract info from each)

### Example Commands (Once Connected)
```
[BROWSE:X] Check notifications
[BROWSE:X] Draft tweet: "BTC analysis thread 🧵"
[BROWSE:RESEARCH] Extract table from: https://coingecko.com
[BROWSE:SCREENSHOT] Capture TradingView chart
[BROWSE:AUTO] Login to bank, download statement (requires approval)
```

## Security Notes

- **Your session is private** — I only access what you explicitly ask
- **I'll confirm before posting** anything publicly
- **You can revoke access** by closing Chrome or removing the flag
- **No credential storage** — I use your existing browser cookies

## Verification

After launching Chrome with debugging, run this to verify:
```powershell
# Check if Chrome is listening on port 9222
Test-NetConnection -ComputerName localhost -Port 9222
```

If it says "TcpTestSucceeded: True", I'm ready to connect.

---
**Next Steps:**
1. Close Chrome (save tabs if needed)
2. Relaunch with `--remote-debugging-port=9222`
3. Log into X if not already logged in
4. Tell me "Chrome is ready" and I'll test the connection
