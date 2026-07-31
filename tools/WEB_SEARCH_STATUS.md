# 🚨 WEB SEARCH TOOL STATUS

**Date:** 2026-07-31 12:25 CET
**Issue:** Gemini web_search model unavailable
**Action Taken:** Documented and provided workarounds

---

## What Happened

1. You asked me to remove Gemini web search
2. I checked OpenClaw config — tool is protected (cannot disable via config.patch)
3. The model (`gemini-2.5-flash`) is hardcoded or set in protected config
4. **Result:** Cannot remove/disable via normal tools

---

## What I Did

✅ **Created workaround documentation:**
- `tools/WEB_SEARCH_BROKEN.md` — Full issue tracking
- Shows alternative methods (web_fetch, browser)

✅ **Verified alternatives work:**
- `web_fetch` ✅ — Fetches specific URLs
- `browser` ✅ — Navigates websites interactively
- `memory/files` ✅ — Uses cached research

---

## How to Actually Fix

### Option 1: Update OpenClaw (Recommended)
```bash
# Update to latest version
npm update -g openclaw

# Or reinstall
npm uninstall -g openclaw
npm install -g openclaw
```

### Option 2: Manual Config Edit
Find OpenClaw config file (usually in):
- `~/.openclaw/config.*`
- `%APPDATA%/openclaw/config.*`

Change:
```json
"web_search": {
  "provider": "gemini",
  "model": "gemini-2.5-flash"  // ← Change to newer model
}
```

To:
```json
"web_search": {
  "provider": "gemini",
  "model": "gemini-2.0-flash"  // or "gemini-1.5-pro"
}
```

### Option 3: Use Alternative Provider
Change to Brave Search or other provider if supported.

---

## Current Workaround Strategy

**When you need web research:**
1. Give me specific URLs → I'll use `web_fetch`
2. Or tell me what to search for → I'll use `browser` to navigate
3. Or I use my knowledge base + dated files

**Example:**
- ❌ "Search for current crypto prices" (web_search broken)
- ✅ "Fetch https://coinmarketcap.com" (web_fetch works)
- ✅ "Open browser and check BTC price on CoinGecko" (browser works)

---

## Impact on Your Projects

| Project | Impact | Workaround |
|---------|--------|------------|
| Revenue research | Minor | Use cached research + web_fetch |
| Market data | None | Using Twelve Data API |
| Dashboard | None | Using direct API calls |
| Newsletter | Minor | Use web_fetch for sources |

---

## Bottom Line

**Cannot remove/disable via tools** — requires OpenClaw config update or reinstall.

**Workarounds are functional** — use `web_fetch` and `browser` instead.

**Say "update openclaw"** if you want me to try updating the package.

---

*Documented: 2026-07-31*
*File: tools/WEB_SEARCH_BROKEN.md*