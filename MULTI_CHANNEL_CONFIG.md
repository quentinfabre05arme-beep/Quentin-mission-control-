# Multi-Channel Configuration for OpenClaw

## Current Configuration

The current `openclaw.json` has this Telegram config:

```json
{
  "telegram": {
    "enabled": true,
    "groups": {
      "*": {
        "requireMention": true
      }
    },
    "botToken": "8572092847:AAFIu6KIMroydqq9PvZNG7_i55Wlhh1lnJw"
  }
}
```

## Problem

The `"*"` wildcard only matches groups where the bot is mentioned. For multiple mission channels to work, we need:

1. **Listen on specific channels** (not just wildcard)
2. **Auto-join groups** when added
3. **Route based on group ID**

## Solution Options

### Option 1: Update openclaw.json (Recommended)

Add specific group configurations:

```json
{
  "telegram": {
    "enabled": true,
    "groups": {
      "*": {
        "requireMention": true
      },
      "-5367479429": {
        "requireMention": false,
        "label": "alpha-fund"
      },
      "-100xxxxxxxx": {
        "requireMention": false,
        "label": "development"
      }
    },
    "botToken": "8572092847:AAFIu6KIMroydqq9PvZNG7_i55Wlhh1lnJw"
  }
}
```

### Option 2: Use Telegram Bot API Webhooks

Set up webhook for multiple groups:

```bash
# Set webhook for all messages
curl -X POST "https://api.telegram.org/bot<token>/setWebhook" \
  -d "url=https://your-openclaw-instance/webhook/telegram"
```

### Option 3: BotFather Configuration

1. Go to @BotFather
2. Set bot to have access to all messages in groups:
   - Send `/setprivacy` to @BotFather
   - Select your bot
   - Choose "Disable" (bot sees all messages)

## Recommended Implementation

### Step 1: Update openclaw.json

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "groups": {
        "*": {
          "requireMention": true
        },
        "-5367479429": {
          "requireMention": false,
          "label": "alpha-fund"
        }
      },
      "botToken": "8572092847:AAFIu6KIMroydqq9PvZNG7_i55Wlhh1lnJw"
    }
  }
}
```

### Step 2: Disable Privacy Mode (in @BotFather)

1. Message @BotFather
2. Send: `/setprivacy`
3. Select your bot
4. Send: `Disable`

### Step 3: Restart OpenClaw

```bash
openclaw gateway restart
```

## Testing

After configuration:

1. Send message in Alpha Fund group
2. OpenClaw should receive it (no mention needed)
3. Responses should go back to Alpha Fund group

## Fallback

If multi-channel listening is not supported by current OpenClaw version:

- Keep main chat (`8685343197`) as primary channel
- Use it for all conversations
- Route mission updates to specific groups (sending only)
- Document: "Main chat = conversation, Mission groups = updates only"

---

## Current Status

| Feature | Status |
|---------|--------|
| Send to Alpha Fund group | ✅ Working |
| Receive from Alpha Fund group | ⬜ Requires config change |
| Multi-channel support | ⬜ Needs OpenClaw config update |

## Next Steps

1. Test Option 1 (update openclaw.json)
2. If not supported, fall back to "send-only" routing
3. Document the limitation

---

**Last Updated:** 2026-07-25 09:48
