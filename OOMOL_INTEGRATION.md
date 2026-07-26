# 🌩️ OOMOL Integration Active

**Date:** 2026-07-26 18:39
**Status:** 🟢 Connected

## Available Actions Discovered

### Gmail Actions
| Action | Description |
|--------|-------------|
| `gmail.send_email` | Send emails |
| `gmail.reply_email` | Reply to threads |
| `gmail.create_email_draft` | Create drafts |
| `gmail.add_label_to_email` | Organize emails |
| `gmail.create_filter` | Auto-filter |

### Google Calendar
| Action | Description |
|--------|-------------|
| `cal.create_schedule` | Create events |
| `cal.list_schedules` | List events |

### Google Drive
| Action | Description |
|--------|-------------|
| `gdrive.upload_file` | Upload files |
| `gdrive.search` | Search files |
| `gdrive.download_file` | Download files |

### GitHub
| Action | Description |
|--------|-------------|
| `github.create_issue` | Create issues |
| `github.list_repos` | List repos |

### Notion
| Action | Description |
|--------|-------------|
| `notion.query_database` | Query databases |
| `notion.create_page` | Create pages |

## Quick Test Commands

```bash
# Send test email
oo connector run gmail.send_email --to "your@email.com" --subject "Test" --body "Hello from OOMOL"

# Create calendar event
oo connector run cal.create_schedule --title "Test Meeting" --start_time "2026-07-27T10:00:00"

# Search Google Drive
oo connector run gdrive.search --query "report"

# Query Notion
oo connector run notion.query_database --database_id "your-db-id"
```

## Want me to:
1. **Test any connector** - Send email, create event, etc.
2. **Build automated workflows** - Daily reports, scheduled emails
3. **Create OOMOL skills** - Reusable workflows
4. **Show all actions** - For any specific service

What would you like to do with OOMOL?
