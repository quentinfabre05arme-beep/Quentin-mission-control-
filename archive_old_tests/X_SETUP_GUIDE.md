# X-Tweet-Fetcher Setup Guide

## Current Status

**Installed:** ✅ x-tweet-fetcher v3.0.0
**Location:** `C:/Users/quent/.openclaw/workspace/x-tweet-fetcher/`
**CLI:** `C:/Users/quent/AppData/Roaming/Python/Python314/Scripts/xtf.exe`

## Issue: Nitter Not Running

X search requires Nitter backend. Currently failing with:
```
[nitter] http://127.0.0.1:8788 failed (upstream_down)
```

## Solutions

### Option 1: Run Nitter (Recommended)

Nitter requires one of:
- **Docker** (not available on this system)
- **Direct Python install** (complex, requires dependencies)
- **WSL** (Windows Subsystem for Linux)

### Option 2: Use Public Nitter Instances

Some public Nitter instances exist but are unreliable:
```bash
# Set environment variable
set XTF_NITTER=https://nitter.net,https://nitter.cz
```

### Option 3: FxTwitter Backend (Limited)

FxTwitter works for:
- Single tweets (`--url`)
- User timelines (`--user`)
- User info (`--user-info`)

Does NOT work for:
- Search (`--search`)
- Monitoring (`--monitor`)

## Current Pipeline Status

The enhanced research pipeline is **functional** with:
- ✅ Framework for X queries
- ✅ Web query fallbacks
- ✅ Content generation
- ✅ Post creation
- ✅ Daily briefing

X search will activate once Nitter is configured.

## Next Steps

1. **Option A:** Set up WSL + Docker for reliable Nitter
2. **Option B:** Use public Nitter instances (temporary)
3. **Option C:** Keep current system (web-based research only)

---
Generated: 2026-07-12
