# Free / Low-Cost Web Research Stack for Claw

## Goal
Give Claw a solid, autonomous web research capability without relying on paid APIs (Serper) or bot-blocking raw HTTP scraping.

---

## Recommended Stack (Tier 1: Free)

### 1. Self-Hosted OpenSERP / SearXNG (Best)
**Why:** Free, multi-engine, no API keys, structured JSON, page extraction.
**Options:**
- **OpenSERP** (Go, Docker) — `docker run -p 7000:7000 karust/openserp:latest serve`
- **SearXNG** (Python, Docker) — meta-search across 70+ engines (`SEARXNG_URL=http://localhost:8080`)
- **vandyand/free-search** (Node.js) — Puppeteer-based, parallel engines

**Cost:** $0 (runs on your machine)
**Reliability:** High — uses real browsers
**Setup time:** 5-15 minutes

### 2. OpenClaw Native `web_search`
**Tool:** `web_search`
**Cost:** $0 (uses configured provider)
**Reliability:** Good for quick SERP snippets
**Note:** Set via OpenClaw gateway config; already wired into `research_router.js`

### 3. Browser-Based Research (Already Built)
**File:** `project_claw_core/agents/browser_researcher.js`
**How:** Headless Puppeteer + DuckDuckGo HTML
**Cost:** $0
**Reliability:** Medium-High — works today, can break if DuckDuckGo changes HTML
**Speed:** ~3-5s per query

### 4. Tavily (Free AI Search)
**File:** `project_claw_core/agents/tavily_search.js`
**Free Tier:** 1,000 searches/month
**Setup:** `export TAVILY_API_KEY=tvly-...`
**Best for:** Clean, AI-ready structured results

### 5. Brave Search (Free Privacy Search)
**File:** `project_claw_core/agents/brave_search.js`
**Free Tier:** ~$5 in credits/month
**Setup:** `export BRAVE_API_KEY=...`
**Best for:** Fast, privacy-first SERP

### 6. RSS + Direct Site Monitoring (Niche/High-Signal)
**File:** `project_claw_core/agents/rss_agent.js`
**How:** Monitor RSS feeds from specific sources (news sites, blogs, SEC, arXiv)
**Cost:** $0
**Best for:** Ongoing monitoring, not broad discovery

---

## Current Router Priority

`research_router.js` now tries, in order:

1. OpenSERP local
2. OpenClaw `web_search`
3. Tavily (if `TAVILY_API_KEY` set)
4. Brave Search (if `BRAVE_API_KEY` set)
5. SearXNG (if `SEARXNG_URL` set)
6. Legacy Serper + HTTP fallbacks
7. Browser-based DuckDuckGo (with 30s timeout)

All optional sources auto-disable if no key/URL is configured.

---

## Recommended Stack (Tier 2: Low-Cost APIs)

| Service | Free Tier | Paid Tier | Why Use |
|---------|-----------|-----------|---------|
| **OpenWeb Ninja** | 100 requests/month | ~$10/1000 | Real-time, structured SERP |
| **Brave Search API** | 2,000 queries/month | $3/1000 | Privacy-first, fast |
| **Bing Web Search API** | 1,000 queries/month | $7/1000 | Reliable, rich features |
| **Exa.ai** | 100 requests/month | ~$10/1000 | Semantic search, great for research |
| **Tavily** | 1,000 requests/month | $0.025/query | Built for AI agents |

---

## Recommended Action Plan

### Immediate (today, free)
1. Keep using `browser_researcher.js` as primary fallback
2. Deploy **OpenSERP** locally via Docker
3. Add OpenSERP client to `project_claw_core/agents/` as a first-class source

### Short-term (this week, low-cost or free)
4. Self-host **SearXNG** for unlimited free search
5. Sign up for **Tavily** free tier (1,000/month) — best for AI agents
6. Sign up for **Brave Search API** free tier ($5/month credits)
7. Add all three as fast API sources before falling back to browser

### Long-term
8. Keep OpenSERP/SearXNG as the primary free backbone
9. Use Tavily/Brave for high-priority queries when local sources are slow

---

## My Recommendation for You

**Deploy OpenSERP or SearXNG locally** — it's the cleanest solution:
- One Docker command
- No API keys needed
- Google, Bing, DuckDuckGo, Yandex, Baidu, Ecosia
- JSON output with page extraction
- No rate limits (your own infra)

Then optionally add free API keys for speed:
- Tavily (`TAVILY_API_KEY`) — 1,000 AI-ready searches/month
- Brave Search (`BRAVE_API_KEY`) — ~$5 credits/month

This gives you **unlimited free research** with high reliability and fast API fallbacks.

---

*Updated: August 3, 2026*
