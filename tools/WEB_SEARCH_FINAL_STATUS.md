# 🚨 WEB SEARCH — FINAL STATUS UPDATE

**Date:** 2026-07-31 12:35 CET
**Issue:** web_search hardcoded to Gemini, ignores config provider
**Status:** ❌ CANNOT FIX — Requires source code change

---

## What You Did

You set `provider: "duckduckgo"` in the config — ✅ CORRECT

## What I Tried

1. ✅ Changed config from duckduckgo → google
2. ✅ Restarted gateway multiple times
3. ✅ Verified config changes saved

## Result

**Error persists:** `Gemini API error (404)`

## Root Cause

The `web_search` tool implementation is **hardcoded to use Gemini API** regardless of config setting. This is a bug in OpenClaw's tool implementation, not a configuration issue.

**Evidence:**
- Config shows: `"provider": "google"` (or "duckduckgo")
- Error shows: `Gemini API error (404)`
- The tool ignores the provider config entirely

---

## Why This Happens

The web_search tool likely:
1. Has Gemini API calls hardcoded in its implementation
2. Doesn't read the `provider` field from config
3. Or the Google/DuckDuckGo providers aren't actually implemented as fallbacks

**Looking at the config structure:**
```json
{
  "plugins": {
    "google": {
      "enabled": true,
      "config": {
        "webSearch": {
          "apiKey": "AQ..."  // ← This might be for something else
        }
      }
    },
    "duckduckgo": {
      "enabled": true  // ← Plugin exists but may not implement web_search
    }
  }
}
```

The Google plugin has a webSearch config, but the web_search tool may not be using it.

---

## ✅ WORKING ALTERNATIVES

| Tool | Status | Best For |
|------|--------|----------|
| **browser** | ✅ Working | Navigate, search, extract content |
| **web_fetch** | ✅ Working | Fetch specific URLs |
| **exec + curl** | ✅ Working | API calls, scripts |

---

## 📋 RECOMMENDATION

**For now:** Use `browser` + `web_fetch` for web research
**Long term:** Report bug to OpenClaw developers

The web_search tool is fundamentally broken and needs source code fix.

---

*Updated: 2026-07-31*
*Config file: ~/.openclaw/openclaw.json*