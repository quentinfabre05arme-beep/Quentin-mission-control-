# Revenue Tracker Mission

## Purpose
Track, analyze, and report all income sources with full historical data and growth analytics.

## Responsibilities
- Record all revenue transactions with timestamps, categories, and metadata
- Calculate totals and breakdowns by income source
- Generate periodic reports (daily, weekly, monthly, yearly)
- Track growth trends and compare periods
- Maintain complete financial history in `memory/`

## Data Schema

### Transaction
```json
{
  "id": "uuid",
  "date": "ISO8601",
  "amount": 0.00,
  "currency": "EUR|USD|BTC",
  "category": "salary|freelance|investment|crypto|dividend|other",
  "source": "description",
  "tags": [],
  "notes": ""
}
```

### Categories
- **salary** — Regular employment income
- **freelance** — Contract/project work
- **investment** — Stock/capital gains
- **crypto** — Cryptocurrency income
- **dividend** — Dividend payments
- **other** — Miscellaneous income

## Reports Generated
1. **Summary Report** — Total revenue, top sources, category breakdown
2. **Trend Report** — Month-over-month and year-over-year growth
3. **Category Report** — Revenue by category with percentages
4. **Period Comparison** — Compare any two time periods

## File Locations
- `revenue_tracker.js` — Main tracker engine
- `team_state.json` — Mission state
- `memory/revenue_data.json` — All transactions
- `memory/revenue_reports/` — Generated reports

## Commands
```bash
# Add a transaction
node revenue_tracker.js add --amount 5000 --category salary --source "Acme Corp" --date 2026-07-15

# Generate monthly report
node revenue_tracker.js report --month 2026-07

# Show category breakdown
node revenue_tracker.js categories --month 2026-07

# Compare periods
node revenue_tracker.js compare --from 2026-06 --to 2026-07

# List all transactions
node revenue_tracker.js list --limit 20
```

## Version History
- v1.0.0 — Initial release (Jul 26, 2026)
