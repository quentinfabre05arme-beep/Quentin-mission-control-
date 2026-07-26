# 🌐 Web Research Assistant Skill

**Description:** Advanced web research using web_fetch with caching and analysis.

## Capabilities

### Multi-Source Research
- Fetch multiple URLs simultaneously
- Extract key information
- Cross-reference sources
- Generate summary reports

### Data Extraction
- Parse HTML content
- Extract tables, lists, key facts
- Identify main topics
- Find citations

### Caching
- Cache fetched content
- Avoid re-fetching same URLs
- Expire old data
- Store locally

## Usage

```javascript
const researcher = new WebResearchAssistant();

// Research a topic
const results = await researcher.research({
  topic: "BTC price analysis",
  sources: [
    "https://coinmarketcap.com/currencies/bitcoin/",
    "https://coindesk.com/markets/"
  ],
  depth: "standard"
});
```

## Implementation

Since web_search tool is broken (Gemini deprecated), this skill uses web_fetch directly.

## Status
**Buildable:** Yes ✅ (uses web_fetch, not process spawn)
