# 🌩️ OOMOL Setup Discovered

**Date:** 2026-07-26 18:38
**Status:** 🟢 Active

## OOMOL CLI Info
- **Version:** 1.5.1
- **Platform:** Windows x64
- **Auth file:** `C:\Users\quent\AppData\Roaming\oo\auth.toml`

## Connected Services (21 total)

### Personal Account (OAuth2)
| Service | Account | Status |
|---------|---------|--------|
| Google Drive | quentin-fabre05arme@gmail.com | ✅ Active |
| Gmail | quentin-fabre05arme@gmail.com | ✅ Active |
| Google Sheets | quentin-fabre05arme@gmail.com | ✅ Active |
| Google Calendar | quentin-fabre05arme@gmail.com | ✅ Active |
| Google Docs | quentin-fabre05arme@gmail.com | ✅ Active |
| Google Photos | quentin-fabre05arme@gmail.com | ✅ Active |
| Outlook | quentin-fabre@live.fr | ✅ Active |
| OneDrive | quentin-fabre@live.fr | ✅ Active |
| GitHub | quentinfabre05arme-beep | ✅ Active |
| Notion | quentin-fabre-s-space | ✅ Active |

### API Key Services
| Service | Status |
|---------|--------|
| OpenAI | ✅ Active (default) |

### Public Services (No Auth)
| Service | Use Case |
|---------|----------|
| arXiv | Research papers |
| PubMed | Medical research |
| Hacker News | Tech news |
| npm | Package info |
| wttr.in | Weather |
| QuickChart | Charts |
| OSS Insight | Open source analytics |
| And 6 more... | Various |

## How to Use OOMOL in OpenClaw

### Example: Send Gmail
```bash
oo connector run gmail --action send --to "recipient@email.com" --subject "Hello" --body "Message"
```

### Example: Create Google Calendar Event
```bash
oo connector run googlecalendar --action create --title "Meeting" --start "2026-07-27T10:00:00" --duration 60
```

### Example: Search Google Drive
```bash
oo connector run googledrive --action search --query "report"
```

### Example: Query Notion
```bash
oo connector run notion --action query --database "Tasks"
```

## Available Skills
| Skill | Purpose |
|-------|---------|
| `oo` | Route to hosted capabilities |
| `oo-find-skills` | Find published skills |
| `oo-create-skill` | Create custom skills |

## Integration Ideas

1. **Auto-sync files** → Google Drive/OneDrive
2. **Schedule meetings** → Google Calendar
3. **Send reports** → Gmail/Outlook
4. **Query research** → arXiv/PubMed
5. **Track packages** → npm
6. **Get weather** → wttr.in
7. **Create charts** → QuickChart

Want me to demonstrate any of these integrations?
