# Skill: Social Media Manager
# Version: 1.0
# Price: $49
# Description: Automates social media posting across X, LinkedIn, and Telegram

## Overview

This skill provides autonomous social media management:
- Content generation based on topics
- Scheduled posting across platforms
- Analytics tracking
- Audience engagement monitoring

## Features

### 1. Content Generation
- Generate posts from topics/keywords
- Multiple formats (text, thread, poll)
- Tone customization (professional, casual, educational)
- Hashtag optimization

### 2. Multi-Platform Posting
- X/Twitter: Text, threads, media
- LinkedIn: Professional posts, articles
- Telegram: Channel updates, announcements

### 3. Scheduling
- Best-time posting algorithm
- Content calendar management
- Queue system for planned posts
- Emergency posting (breaking news)

### 4. Analytics
- Engagement tracking (likes, retweets, comments)
- Follower growth monitoring
- Content performance scoring
- Weekly/monthly reports

## Installation

```bash
# Install the skill
cd skills
npm install social-media-manager

# Configure
node setup.js --platforms=x,linkedin,telegram
```

## Configuration

```json
{
  "platforms": {
    "x": {
      "enabled": true,
      "api_key": "your_x_api_key",
      "posting_times": ["08:00", "12:00", "18:00"],
      "max_daily_posts": 3
    },
    "linkedin": {
      "enabled": true,
      "api_key": "your_linkedin_api_key",
      "posting_times": ["09:00", "14:00"],
      "max_daily_posts": 2
    },
    "telegram": {
      "enabled": true,
      "bot_token": "your_bot_token",
      "channel_id": "@your_channel",
      "posting_times": ["10:00", "16:00"]
    }
  },
  "content": {
    "topics": ["AI", "technology", "business"],
    "tone": "professional",
    "language": "en",
    "max_chars": 280
  }
}
```

## Usage

### Manual Post
```javascript
const sm = require('social-media-manager');

// Generate and post
await sm.generateAndPost({
  topic: "AI automation",
  platform: "x",
  tone: "educational"
});
```

### Scheduled Campaign
```javascript
// Schedule week of content
await sm.scheduleCampaign({
  startDate: "2026-08-01",
  posts: [
    { day: 1, topic: "AI trends", platform: "x" },
    { day: 2, topic: "Productivity", platform: "linkedin" },
    { day: 3, topic: "Automation", platform: "telegram" }
  ]
});
```

### Analytics Report
```javascript
// Generate weekly report
const report = await sm.generateReport({
  period: "weekly",
  platforms: ["x", "linkedin"]
});

console.log(report);
```

## API

### Methods

#### `generatePost(options)`
Generate a single post
- `options.topic` - Post topic
- `options.platform` - Target platform
- `options.tone` - Content tone
- Returns: Generated post text

#### `post(content, platform)`
Publish to platform
- `content` - Post text
- `platform` - Platform name
- Returns: Post ID/status

#### `schedule(posts)`
Schedule multiple posts
- `posts` - Array of post objects
- Returns: Schedule confirmation

#### `getAnalytics(period)`
Get performance data
- `period` - "daily", "weekly", "monthly"
- Returns: Analytics object

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Basic** | $49 | 1 platform, 5 posts/day |
| **Pro** | $99 | 3 platforms, 15 posts/day |
| **Enterprise** | $199 | Unlimited, analytics API |

## Support

- Documentation: docs.openclaw.ai/skills/social-media-manager
- Issues: github.com/openclaw/skills/issues
- Updates: Auto-update via skill marketplace

## Changelog

### v1.0 (2026-07-25)
- Initial release
- X/Twitter support
- LinkedIn support
- Telegram support
- Basic analytics

## License

MIT License - OpenClaw Skill Marketplace
