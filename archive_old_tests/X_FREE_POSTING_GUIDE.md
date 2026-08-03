# Free X/Twitter Posting Solution - OpenClaw

## Overview
Uses XActions MCP server (free, no API fees) to post to X/Twitter via session cookie authentication.

## Setup Steps

### 1. Get auth_token Cookie
1. Open Chrome and go to https://x.com
2. Log in to @quentinvest1 account
3. Open DevTools (F12)
4. Go to Application → Cookies → https://x.com
5. Find `auth_token` cookie and copy its value
6. Store securely in `.env` file:
   ```
   XACTIONS_SESSION_COOKIE=your_auth_token_here
   ```

### 2. Install XActions MCP Server
```bash
cd C:\Users\quent\.openclaw\workspace\xactions-toolkit
npm install
npm run build
```

### 3. Configure MCP for OpenClaw
Add to OpenClaw MCP config or run directly:
```bash
npx xactions-mcp
```

## Posting Methods

### Method 1: Browser Console Script (Immediate, Free)
```javascript
// Post from browser console when logged in
(async () => {
  const text = "Your post text here";
  
  // Click compose
  document.querySelector('[data-testid="SideNav_NewTweet_Button"]')?.click();
  await new Promise(r => setTimeout(r, 1000));
  
  // Enter text
  const box = document.querySelector('[data-testid="tweetTextarea_0"]');
  if (box) {
    box.innerHTML = `<span>${text}</span>`;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Click post
  await new Promise(r => setTimeout(r, 500));
  document.querySelector('[data-testid="tweetButton"]')?.click();
})();
```

### Method 2: XActions MCP Server (Recommended)
Once configured, OpenClaw can call:
- `post_tweet` - Post a new tweet
- `reply_to_tweet` - Reply to existing
- `like_tweet` - Engagement
- `get_timeline` - Read feed

### Method 3: Windows Automation (Semi-Automated)
Use AutoHotkey or PowerShell to simulate clicks on already-logged-in Chrome.

## Integration with OpenClaw

### Queue-Based Posting
1. `x_autonomous.js` generates content → adds to `x_queue.json`
2. `x_free_poster.js` runs every hour via Task Scheduler
3. Script posts using browser automation or MCP
4. Marks complete in queue

### Security
- auth_token stored in `.env` (gitignored)
- Never expose token in logs
- Token rotation every 90 days recommended

## Cost
**$0** - XActions is free, open-source. No API fees.

## Files
- `x_free_poster.js` - Main posting script
- `x_queue.json` - Post queue
- `logs/x_posts.log` - Activity log
- `xactions-toolkit/` - XActions installation

## Troubleshooting

### auth_token expired
- Re-login to X
- Get new token from DevTools
- Update `.env` file

### Rate limited
- XActions has built-in rate limiting
- Wait 15 minutes between posts
- Check logs for retry info

### MCP server not connecting
- Verify `XACTIONS_SESSION_COOKIE` is set
- Check Node.js version (>=18)
- Run `npx xactions-mcp --debug`
