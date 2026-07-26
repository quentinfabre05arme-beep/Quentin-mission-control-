# 🔬 Deep Research Mode

**Description:** Multi-step autonomous research with source verification and citation tracking.

## Why This Matters (2026 Standard)

Single searches are obsolete. Modern agents must:
- Query multiple sources
- Verify claims across sources
- Track and cite sources
- Synthesize conflicting information
- Report confidence levels

## Workflow

### Phase 1: Query Expansion
```
User: "What's happening with BTC?"
↓
Expand to:
1. "BTC price today"
2. "Bitcoin news last 24 hours"
3. "BTC technical analysis"
4. "Bitcoin sentiment analysis"
5. "Crypto market trends"
```

### Phase 2: Multi-Source Collection
- Search engines (Serper)
- News APIs
- Social sentiment
- On-chain data
- Technical indicators

### Phase 3: Verification
```
Claim: "BTC up 5%"
Source A: Confirms +5.2%
Source B: Confirms +4.9%
Source C: Different timeframe, +3.1%
↓
Verified: ✅ (+5% ± 1%)
```

### Phase 4: Synthesis
```
Conflicting info:
- Bullish: ETF inflows, institutional buying
- Bearish: Regulatory concerns, profit taking
↓
Balanced view: "Mixed signals. Short-term bullish on
institutional adoption, but regulatory headwinds persist."
```

### Phase 5: Citation Report
```
📊 Research Report: BTC Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sources consulted: 12
Claims verified: 8/10
Confidence: HIGH

Key Findings:
• Price: $67,420 (+5.1% 24h) [Source: CoinGecko, verified]
• Sentiment: 73% bullish [Source: Alternative.me, verified]
• Volume: $45B [Source: CoinMarketCap, verified]
⚠️ Unverified: "Whale accumulation" — only 1 source

Citations:
[1] CoinGecko — BTC/USD price
[2] CoinMarketCap — Market data
[3] Alternative.me — Fear & Greed
```

## Features

### Source Hierarchy
```
Tier 1 (Highest): Official APIs, primary data
Tier 2 (High): Established news (Reuters, Bloomberg)
Tier 3 (Medium): Crypto-native (CoinDesk, The Block)
Tier 4 (Low): Social media, forums (context only)
```

### Confidence Scoring
```
Verified by 3+ sources: 95%
Verified by 2 sources: 80%
Single source: 60%
Conflicting sources: 50%
Unverified: 30%
```

### Auto-Correction
```
If sources conflict:
→ Flag for manual review
→ Report both perspectives
→ Suggest primary source
→ Lower confidence score
```

## Implementation

```javascript
const research = new DeepResearchMode();

const report = await research.execute({
  query: "BTC market analysis",
  depth: 'comprehensive', // quick | standard | comprehensive
  sources: ['price', 'news', 'sentiment', 'technical'],
  verify: true
});

// Returns structured report with citations
```

## Output Format

```markdown
# Research Report: [Topic]
**Date:** [ISO date]
**Depth:** [quick/standard/comprehensive]
**Sources:** [N consulted, M verified]

## Executive Summary
[2-3 sentences with key finding]

## Verified Claims
| Claim | Source | Confidence |
|-------|--------|------------|
| [Fact] | [Source] | [Score] |

## Unverified/Contested
⚠️ [Claim] — Source: [Single source or conflicting]

## Sources
[1] [URL] — [Title] — [Date]
[2] [URL] — [Title] — [Date]

## Recommendations
- [Actionable insight]
```

## Status
**Version:** 1.0
**Tier:** Industry Standard (2026)
**Integration:** Works with multi-agent orchestrator
