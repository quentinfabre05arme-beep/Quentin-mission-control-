# Google Drive Librarian Mission

## Mission Objective
Same self-recurring file management and organization for Google Drive as OneDrive, using oo API access.

## Access Method
- **oo Connector**: `googledrive.files.list` (authenticated ✅)
- **API**: Native Google Drive API via oo
- **Authentication**: Already connected (quentin.fabre05arme@gmail.com)

## Capabilities

### 1. FILE LISTING & INDEXING
```bash
oo connector run "googledrive" --action "files.list" --data "{\"pageSize\": 100}" --json
```

**Fields Captured:**
- `id` — Unique file identifier
- `name` — Filename
- `mimeType` — File type
- `webViewLink` — Direct URL
- `createdTime` / `modifiedTime` — Dates
- `sizeBytes` — File size
- `parents` — Folder structure
- `owners` — Ownership info
- `shared` / `starred` / `trashed` — Status flags

### 2. CATEGORIZATION
Auto-categorize by filename patterns:
- **investment** — stock, crypto, DCF, portfolio, trading
- **pod_business** — printify, etsy, revenue, product
- **mission_control** — automation, dashboard, claw
- **business** — accounting, tax, freelance
- **personal** — health, nutrition, family

### 3. SELF-RECURRING LOOPS

#### Daily Scan (06:30 CET)
- List new/modified files since last scan
- Update catalog with new entries
- Detect moved/renamed files
- Silent execution

#### Weekly Organization (Sundays 10:30 CET)
- Review file distribution
- Suggest folder reorganization
- Identify duplicates (by name/size)
- Categorize uncategorized files

#### Monthly Deep Clean (1st of month 08:30 CET)
- Full catalog rebuild
- Archive old files (>6 months)
- Update taxonomy based on usage
- Generate usage reports

### 4. CROSS-DRIVE SYNC (Future)
- Mirror important files between OneDrive ↔ Google Drive
- Sync by category (investment files to both)
- Conflict resolution by date modified

## Files
- `google_drive_librarian.ps1` — Main indexer script
- `catalog/google_drive_catalog.json` — File index
- `fetch_gdrive.cmd` — oo API wrapper

## Commands

### Index Google Drive
```powershell
.\missions\file_librarian\google_drive_librarian\index_gdrive.ps1
```

### Search Google Drive
```powershell
# By filename
oo connector run "googledrive" --action "files.list" --data "{\"q\": \"name contains 'Stock'\"}" --json

# Full text search (requires export/read)
# Uses Google Drive native search
```

### Compare with OneDrive
```powershell
.\missions\file_librarian\compare_drives.ps1
```

## Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| `gdrive-daily-scan` | 06:30 daily | Incremental file listing |
| `gdrive-weekly-org` | Sundays 10:30 | Organization review |
| `gdrive-monthly-clean` | 1st 08:30 | Deep clean + archive |

## Integration with OneDrive Librarian

Unified search across both systems:
```powershell
# Search both drives
.\missions\file_librarian\unified_search.ps1 -Query "MSTR analysis"
```

## Escalation Criteria
- API authentication failures
- Shared drive access issues
- Duplicate resolution conflicts
- Large file transfers (>100MB)