# Alpha Signals Bot - Scheduling Guide

## Windows Task Scheduler Setup

### Daily Signal Report (09:00 AM)

1. Open **Task Scheduler** (taskschd.msc)
2. Click **Create Basic Task**
3. Name: `Alpha-Signals-Daily`
4. Trigger: **Daily** at `09:00:00`
5. Action: **Start a program**
6. Configure:
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\quent\.openclaw\workspace\missions\alpha_signals\runner.ps1" -Command daily`
   - Start in: `C:\Users\quent\.openclaw\workspace\missions\alpha_signals`
7. Click **Finish**

### Alert Check (Every 6 Hours)

1. Create another task: `Alpha-Signals-Alerts`
2. Trigger: **Daily**, repeat every **6 hours**
3. Action: Same as above but with `-Command alert`

### Command Line Setup (Alternative)

```powershell
# Create daily task at 9 AM
schtasks /create /tn "Alpha-Signals-Daily" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Users\quent\.openclaw\workspace\missions\alpha_signals\runner.ps1 -Command daily" /sc daily /st 09:00

# Create alert check every 6 hours
schtasks /create /tn "Alpha-Signals-Alerts" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Users\quent\.openclaw\workspace\missions\alpha_signals\runner.ps1 -Command alert" /sc hourly /mo 6
```

## Manual Execution

```powershell
# Daily report
.\runner.ps1 -Command daily

# Alert check (urgent signals only)
.\runner.ps1 -Command alert

# Summary mode
.\runner.ps1 -Command run -Summary

# With JSON output
.\runner.ps1 -Command run -Json
```

## Telegram Integration (Future)

When ready to send to Telegram:

1. Create `config.json`:
```json
{
  "outputMode": "telegram",
  "telegramChatId": "YOUR_CHAT_ID",
  "telegramBotToken": "YOUR_BOT_TOKEN"
}
```

2. Set environment variable:
```powershell
$env:TELEGRAM_BOT_TOKEN = "your-token-here"
```

3. Run with Telegram output:
```powershell
node bot.js daily
```

## Monitoring

Check logs in `data/logs/` directory:
- `bot_daily_YYYY-MM-DD_HH-mm-ss.log`
- `bot_alert_YYYY-MM-DD_HH-mm-ss.log`

## Signal History

All signals are stored in `data/signal_history.json` for trend analysis.
