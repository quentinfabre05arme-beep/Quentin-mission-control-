# Skill: SEO Optimizer
# Version: 1.0
# Price: $59
# Description: Automated SEO analysis, keyword research, and content optimization

## Overview

This skill provides autonomous SEO optimization:
- Keyword research and analysis
- Content optimization suggestions
- Rank tracking
- Competitor analysis
- Technical SEO audits
- Backlink monitoring

## Features

### 1. Keyword Research
- Volume estimation
- Competition analysis
- Long-tail discovery
- Trend detection
- SERP feature analysis

### 2. Content Optimization
- Title optimization
- Meta description generation
- Header structure analysis
- Keyword density check
- Readability scoring
- Internal linking suggestions

### 3. Rank Tracking
- Daily position monitoring
- Competitor comparison
- SERP feature tracking
- Geo-specific rankings
- Mobile vs desktop

### 4. Technical SEO
- Page speed analysis
- Mobile-friendliness
- Schema markup check
- Canonical tag verification
- Sitemap validation

### 5. Competitor Analysis
- Top competitor identification
- Content gap analysis
- Backlink gap identification
- Keyword overlap detection
- Strategy recommendations

## Installation

```bash
cd skills
npm install seo-optimizer
node setup.js --website=https://your-site.com
```

## Configuration

```json
{
  "website": "https://your-site.com",
  "targetKeywords": ["ai automation", "workflow automation", "productivity tools"],
  "competitors": [
    "https://competitor1.com",
    "https://competitor2.com"
  ],
  "tracking": {
    "frequency": "daily",
    "locations": ["US", "UK", "FR"],
    "devices": ["desktop", "mobile"]
  },
  "content": {
    "minWordCount": 1000,
    "targetReadability": 60,
    "keywordDensity": 1.5
  }
}
```

## Usage

### Keyword Research
```javascript
const seo = require('seo-optimizer');

// Research keywords
const keywords = await seo.researchKeywords({
  seed: 'automation software',
  volume: 'medium',
  competition: 'low'
});

console.log(keywords);
```

### Content Optimization
```javascript
// Optimize article
const optimized = await seo.optimizeContent({
  title: 'How to Automate Your Workflow',
  content: 'Your article text here...',
  targetKeyword: 'workflow automation'
});

console.log(optimized.suggestions);
```

### Rank Tracking
```javascript
// Check rankings
const rankings = await seo.checkRankings({
  keywords: ['ai automation', 'workflow tools'],
  location: 'US'
});

console.log(rankings);
```

### Competitor Analysis
```javascript
// Analyze competitors
const analysis = await seo.analyzeCompetitors({
  competitor: 'https://competitor.com',
  keywords: ['automation', 'productivity']
});

console.log(analysis.gaps);
```

## API

### Methods

#### `researchKeywords(options)`
Find keyword opportunities
- `options.seed` - Starting keyword
- `options.volume` - Target volume level
- `options.competition` - Competition level
- Returns: Array of keyword objects

#### `optimizeContent(options)`
Analyze and optimize content
- `options.title` - Page title
- `options.content` - Page content
- `options.targetKeyword` - Primary keyword
- Returns: Optimization report

#### `checkRankings(options)`
Check search rankings
- `options.keywords` - Keywords to check
- `options.location` - Geographic location
- Returns: Ranking data

#### `auditTechnical(options)`
Run technical SEO audit
- `options.url` - Page URL
- Returns: Audit report with issues

#### `analyzeCompetitors(options)`
Analyze competitor strategies
- `options.competitor` - Competitor URL
- `options.keywords` - Keywords to analyze
- Returns: Competitor analysis

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Basic** | $59 | 10 keywords, basic audit, weekly tracking |
| **Pro** | $99 | 50 keywords, advanced audit, daily tracking |
| **Enterprise** | $199 | Unlimited, API access, custom reports |

## Support

- Documentation: docs.openclaw.ai/skills/seo-optimizer
- Issues: github.com/openclaw/skills/issues
- Updates: Auto-update via skill marketplace

## Changelog

### v1.0 (2026-07-25)
- Initial release
- Keyword research
- Content optimization
- Rank tracking
- Competitor analysis

## License

MIT License - OpenClaw Skill Marketplace
