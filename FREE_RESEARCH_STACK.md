# Free / Low-Cost Web Research Stack for Claw

## Goal
Give Claw a solid, autonomous web research capability without relying on paid APIs (Serper) or bot-blocking raw HTTP scraping.

---

## Recommended Stack (Tier 1: Free)

### 1. Self-Hosted OpenSERP / SearXNG (Best)
**Why:** Free, multi-engine, no API keys, structured JSON, page extraction.
**Options:**
- **OpenSERP** (Go, Docker) — `docker run -p 7000:7000 karust/openserp:latest serve`
- **SearXNG** (Python, Docker) — meta-search across 70+ engines
- **vandyand/free-search** (Node.js) — Puppeteer-based, parallel engines

**Cost:** $0 (runs on your machine)
**Reliability:** High — uses real browsers
**Setup time:** 5-15 minutes

### 2. Browser-Based Research (Already Built)
**File:** `project_claw_core/agents/browser_researcher.js`
**How:** Headless Puppeteer + DuckDuckGo HTML
**Cost:** $0
**Reliability:** Medium-High — works today, can break if DuckDuckGo changes HTML
**Speed:** ~3-5s per query

### 3. RSS + Direct Site Monitoring (Niche/High-Signal)
**File:** `project_claw_core/agents/rss_agent.js`
**How:** Monitor RSS feeds from specific sources (news sites, blogs, SEC, arXiv)
**Cost:** $0
**Best for:** Ongoing monitoring, not broad discovery

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

### Short-term (this week, low-cost)
4. Sign up for **Brave Search API free tier** (2,000/month)
5. Add Brave as a fast API source before falling back to browser
6. Add **Tavily** or **Exa** for AI-focused research queries

### Long-term
7. Self-host **SearXNG** for unlimited, private, multi-engine search
8. Build a research router that picks source by query type:
   - Quick facts → Brave API
   - Market/competitors → OpenSERP/SearXNG
   - Deep research → Tavily/Exa
   - Fallback → browser_researcher

---

## My Recommendation for You

**Deploy OpenSERP locally** — it's the cleanest solution:
- One Docker command
- No API keys needed
- Google, Bing, DuckDuckGo, Yandex, Baidu, Ecosia
- JSON output with page extraction
- No rate limits (your own infra)

Then I build a unified `research_router.js` that tries:
1. OpenSERP local
2. Browser-based DuckDuckGo
3. Any API key you later add (Brave/Tavily)

This gives you **unlimited free research** with high reliability.

---

*Created: August 2, 2026*
