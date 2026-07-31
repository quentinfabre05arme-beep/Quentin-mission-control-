# 🔧 WEB SEARCH FIX — MANUAL STEPS REQUIRED

**Date:** 2026-07-31 12:26 CET
**Status:** ⚠️ Protected config — requires manual intervention

---

## Problem

The `web_search` tool is configured to use **Gemini provider** with model `gemini-2.5-flash`, which is no longer available.

**Error:**
```
Gemini API error (404): This model models/gemini-2.5-flash is no longer available
```

---

## Why Automatic Fix Failed

I tried to:
1. ❌ Disable web_search via `config.patch` → **Protected path**
2. ❌ Change provider to "perplexity" → **Protected path**
3. ❌ Update model → **Not exposed in config**

**The model is hardcoded** in the Gemini provider implementation, not in user-configurable config.

---

## ✅ WORKING SOLUTIONS NOW

### Option 1: Use `web_fetch` (Recommended)
```javascript
// Fetch specific URLs directly
web_fetch("https://example.com")
```

### Option 2: Use `browser` (For Navigation)
```javascript
// Navigate and interact with websites
browser(action: "open", url: "https://example.com")
```

### Option 3: Use Perplexity via API Directly
If you have a Perplexity API key, I can query it directly via exec/curl.

---

## 🔧 PERMANENT FIX OPTIONS

### Option A: Update OpenClaw Package
```bash
npm update -g openclaw
```
This may update the Gemini provider to use a newer model.

### Option B: Reinstall OpenClaw
```bash
npm uninstall -g openclaw
npm install -g openclaw
```
Fresh install with updated providers.

### Option C: Manual Config Edit
Edit the config file directly (requires finding it):

**Possible locations:**
- `~/.openclaw/config.json`
- `~/.openclaw/config.yaml`
- `%APPDATA%/openclaw/config.json`
- `%LOCALAPPDATA%/openclaw/config.json`

**Look for:**
```json
{
  "tools": {
    "web": {
      "search": {
        "provider": "gemini"
      }
    }
  }
}
```

**Change to:**
```json
{
  "tools": {
    "web": {
      "search": {
        "provider": "perplexity",
        "apiKey": {
          "source": "env",
          "provider": "perplexity",
          "id": "PERPLEXITY_API_KEY"
        }
      }
    }
  }
}
```

### Option D: Set Environment Variable
Set `PERPLEXITY_API_KEY` or `SERPER_API_KEY` environment variable. OpenClaw auto-detects available providers from env vars.

---

## 🛠️ IMMEDIATE WORKAROUND SCRIPT

I can create a script that queries Perplexity API directly:

```javascript
// perplexity_search.js
const API_KEY = process.env.PERPLEXITY_API_KEY;
const response = await fetch('https://api.perplexity.ai/search', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({ query: "your search query" })
});
```

**Would you like me to create this workaround?**

---

## 📋 SUMMARY

| Method | Status | Effort |
|--------|--------|--------|
| Disable web_search | ❌ Protected | N/A |
| Change provider | ❌ Protected | N/A |
| Update OpenClaw | ✅ Possible | Low |
| Reinstall OpenClaw | ✅ Possible | Medium |
| Manual config edit | ✅ Possible | High |
| Use web_fetch | ✅ Working now | None |
| Use browser | ✅ Working now | None |
| Custom Perplexity script | ✅ Can build | Medium |

---

## 🚀 RECOMMENDATION

**Short term:** Use `web_fetch` and `browser` for web research
**Medium term:** Update or reinstall OpenClaw
**Long term:** Set up Perplexity API key for native web search

---

*Documented: 2026-07-31*
*File: tools/WEB_SEARCH_FIX.md*