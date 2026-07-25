# Mission Channel Setup Guide

## Manual Steps Required (You need to do these on your phone)

### Step 1: Create Telegram Groups

Create 5 groups in Telegram:

1. **"Alpha Fund Research"** 📊
   - For: Portfolio updates, trades, research cycles
   - Add: @your_bot_name

2. **"Claw Development"** 💻
   - For: Code updates, architecture, deployments
   - Add: @your_bot_name

3. **"Mission Control Dashboard"** 📱
   - For: Dashboard status, cycle updates, alerts
   - Add: @your_bot_name

4. **"POD Business"** 🎨
   - For: Sales, designs, growth metrics
   - Add: @your_bot_name

5. **"System Health"** ⚙️
   - For: Cron jobs, errors, system status
   - Add: @your_bot_name

### Step 2: Get Group Chat IDs

**Method A: Using @userinfobot**
1. Add @userinfobot to each group
2. Send any message in the group
3. Bot will reply with the chat ID (negative number)

**Method B: Using @getidsbot**
1. Add @getidsbot to each group
2. Send /start
3. Bot will show group info including ID

**Method C: Check URL**
1. Open group in Telegram Web
2. URL will show something like: t.me/c/1234567890
3. The number is the group ID (add -100 prefix for supergroups)

### Step 3: Share IDs with Claw

Send me the group IDs in this format:
```
Alpha Fund: -1001234567890
Development: -1001234567891
Dashboard: -1001234567892
POD Business: -1001234567893
System Health: -1001234567894
```

### Step 4: I'll Configure Routing

Once I have the IDs, I'll:
1. Update `MISSION_MANAGEMENT_ARCHITECTURE.md`
2. Create `mission_router.js`
3. Set up automatic routing
4. Test each channel

---

## Current Status

| Channel | Status | ID Needed |
|---------|--------|-----------|
| Alpha Fund Research | 🟡 Pending | ⬜ |
| Claw Development | 🟡 Pending | ⬜ |
| Mission Control | 🟡 Pending | ⬜ |
| POD Business | 🟡 Pending | ⬜ |
| System Health | 🟡 Pending | ⬜ |

---

## Next Steps

1. ✅ You create groups (now)
2. ⬜ You get group IDs
3. ⬜ You share IDs with me
4. ⬜ I configure routing
5. ⬜ Test all channels

**Ready when you are!** 🚀
