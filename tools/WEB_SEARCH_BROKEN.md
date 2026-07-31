# 🚨 BROKEN TOOL ALERT: Gemini Web Search

**Date:** 2026-07-31 12:25 CET
**Status:** 🔴 CRITICAL — Tool non-functional

---

## Problem

The `web_search` tool fails with error:
```
Gemini API error (404): This model models/gemini-2.5-flash is no longer available 
to new users. Please update your code to use a newer model.
```

---

## Impact

- ❌ Cannot search web for current information
- ❌ Cannot research current prices, trends, news
- ❌ Limits ability to get up-to-date data

---

## Workarounds (Active)

| Method | Tool | Status | Notes |
|--------|------|--------|-------|
| **Direct URL fetching** | `web_fetch` | ✅ Working | Use for specific pages |
| **Browser automation** | `browser` | ✅ Working | Use for interactive sites |
| **Local knowledge** | Memory/Files | ✅ Working | Use cached research |

---

## How to Fix

### Option 1: Update Model (Recommended)
Edit OpenClaw config to use newer Gemini model:

```json
{
  "tools": {
    "web_search": {
      "provider": "google",
      "model": "gemini-2.0-flash"  // or newer
    }
  }
}
```

### Option 2: Switch Provider
Use alternative search provider:
- Brave Search API
- Serper.dev (already configured)
- Bing Search API

### Option 3: Disable Web Search
Remove from tools and rely on:
- web_fetch for specific URLs
- browser for navigation
- local research files

---

## Current Strategy

**When research needed:**
1. Try `web_fetch` on known URLs first
2. Use `browser` for exploration
3. Fall back to knowledge base + dated research
4. Note in output if data may be outdated

---

## Affected Sessions

- All sessions using `web_search` tool
- Revenue research (worked around with knowledge base)
- Market data (using Twelve Data API instead)

---

## Recommended Action

**For User:**
- Update OpenClaw config when new version available
- Use `web_fetch` + `browser` as primary web tools

**For Admin:**
- Update Gemini model in tool config
- Or disable web_search until fixed

---

*Last updated: 2026-07-31*
*Issue tracked in: tools/WEB_SEARCH_BROKEN.md*