## For Reliable Web Search, I Need:

### ✅ Already Have:
- **Serper.dev API key** (2,500 searches/month free)
- **DuckDuckGo plugin** (free, no key needed)

### 🔧 What I Need You To Do:

**Option 1: Use Serper (Recommended)**
```powershell
# Set as env variable (temporary)
$env:SERPER_API_KEY="1a32d04a8215dde72b67e554c94409ce580094f3"

# Or add to openclaw.json secrets
```

**Option 2: Install DuckDuckGo Plugin**
```powershell
# In terminal
openclaw plugins install duckduckgo
```

**Option 3: Use web_fetch Directly**
- I can fetch specific URLs without search
- Works for known websites/docs

### 🚀 Quickest Fix:

**Set the Serper env variable and restart:**
```powershell
$env:SERPER_API_KEY="1a32d04a8215dde72b67e554c94409ce580094f3"
openclaw gateway restart
```

This gives me reliable web search immediately.

**Want me to guide you through this?** Or prefer to install DuckDuckGo plugin?
