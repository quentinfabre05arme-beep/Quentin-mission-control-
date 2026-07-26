# 🧠 Pattern Extractor Skill

**Description:** Learn from user behavior and automate recurring patterns.

## What It Learns

### Time Patterns
- "Check BTC at 9am" → Pre-load at 8:55
- "Review portfolio Monday mornings" → Auto-prepare

### Topic Patterns
- Frequently mentioned tickers → Keep data fresh
- Common research topics → Pre-search

### Format Preferences
- Likes concise → Auto-compress
- Likes tables → Format as tables
- Hates verbose → Warn if output > 500 words

### Action Chains
- "Research → Analyze → Deploy" → Auto-chain
- "Check → Alert → Fix" → Proactive mode

## Files
- `extractor.js` — Pattern detection engine
- `memory/learned_patterns.json` — Stored patterns
