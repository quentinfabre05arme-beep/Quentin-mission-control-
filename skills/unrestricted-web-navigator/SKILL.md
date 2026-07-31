---
name: "unrestricted-web-navigator"
description: "Unrestricted web navigation and browser automation system"
---

# Unrestricted Web Navigator

**Purpose:** Full web access for research, data extraction, account management, and automation without artificial limitations.

## Capabilities

### 1. Deep Research
- Navigate any website (news, research papers, financial data)
- Extract structured data from any page
- Follow pagination, infinite scroll
- Handle JavaScript-rendered content
- Bypass basic anti-bot measures (respectful rate limiting)

### 2. Account Management
- Login to services via browser automation
- Manage cookies/sessions persistently
- 2FA handling (manual assist when needed)
- Profile switching for multiple accounts

### 3. Data Extraction Patterns

```javascript
// Pattern: News article extraction
async function extractArticle(url) {
  const page = await browser.open(url);
  const title = await page.select('h1, .article-title');
  const author = await page.select('.author, [rel="author"]');
  const date = await page.select('time, .published-date');
  const body = await page.select('.article-body, .content, article');
  return { title, author, date, body };
}

// Pattern: Table/data extraction
async function extractTable(url, selector) {
  const page = await browser.open(url);
  const rows = await page.selectAll(`${selector} tr`);
  return rows.map(row => {
    const cells = row.querySelectorAll('td, th');
    return cells.map(c => c.textContent.trim());
  });
}

// Pattern: Multi-page scraping
async function scrapePaginated(baseUrl, maxPages = 10) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseUrl}?page=${page}`;
    const data = await extractTable(url, '.data-table');
    if (data.length === 0) break;
    results.push(...data);
    await sleep(1000); // Respectful delay
  }
  return results;
}
```

### 4. Session Persistence

```javascript
// Save session state
async function saveSession(siteName) {
  const cookies = await browser.cookies.getAll();
  const storage = await browser.execute('JSON.stringify(localStorage)');
  const state = { cookies, storage, timestamp: Date.now() };
  await fs.writeFile(`sessions/${siteName}.json`, JSON.stringify(state));
}

// Restore session state
async function restoreSession(siteName) {
  const state = JSON.parse(await fs.readFile(`sessions/${siteName}.json`));
  await browser.cookies.setAll(state.cookies);
  await browser.execute(`Object.assign(localStorage, ${state.storage})`);
}
```

### 5. Research Workflows

#### Financial Research
```
INPUT: "MSTR Q2 earnings"
WORKFLOW:
  1. Search SEC EDGAR for latest 10-Q
  2. Extract key metrics (revenue, BTC holdings, debt)
  3. Compare with analyst estimates (Yahoo Finance)
  4. Check recent news sentiment
  5. Update investment_fund/data/mstr_analysis.json
  6. Alert if significant change
```

#### Trend Monitoring
```
INPUT: "AI infrastructure trends"
WORKFLOW:
  1. Search Twitter/X for trending hashtags
  2. Check Reddit r/MachineLearning, r/localLLaMA
  3. Scan Hacker News front page
  4. Extract GitHub trending repositories
  5. Summarize findings
  6. Queue relevant content for social posts
```

#### Competitive Intelligence
```
INPUT: "HIMS competitors"
WORKFLOW:
  1. Search Crunchbase for telehealth companies
  2. Extract funding data, valuations
  3. Check App Store rankings (health category)
  4. Monitor competitor social media activity
  5. Build comparison matrix
```

## Safety & Ethics

### Respectful Automation
- Rate limiting: Max 1 request/second per domain
- Respect robots.txt (when reasonable)
- No credential harvesting from users
- No spam or abuse patterns

### Security
- Session files encrypted at rest
- No plaintext passwords in logs
- Cookie expiration monitoring
- Automatic logout on suspicious activity

## Implementation

### Files
```
web_navigator/
├── browser_manager.js      # Session management, persistence
├── extractors/
│   ├── news.js             # Article extraction
│   ├── financial.js        # SEC, earnings data
│   ├── social.js           # Twitter, Reddit trends
│   └── research.js         # Academic papers, patents
├── workflows/
│   ├── earnings_research.js
│   ├── trend_monitoring.js
│   └── competitive_intel.js
└── sessions/               # Persistent cookie storage
    ├── twitter.json
    ├── reddit.json
    └── github.json
```

### Browser Profile Strategy
```
Profiles:
  - default: General browsing, research
  - twitter: X/Twitter automation
  - financial: SEC, Yahoo Finance, Bloomberg
  - social: Reddit, Discord, Telegram

Each profile:
  - Separate cookie jar
  - Separate localStorage
  - Separate user agent (optional)
  - Persistent across sessions
```

## Activation

1. Create `web_navigator/` directory structure
2. Initialize browser profiles
3. Test with simple extraction task
4. Enable for all research workflows

---
**Status:** Proposed | **Risk:** Low | **Cost:** €0
