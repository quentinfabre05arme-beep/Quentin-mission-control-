# 🔄 Self-Audit Skill Proposal

**Description:** Track autonomous decisions, calculate cost/value, flag uncertainty, propose improvements.

## Activation
```json
{
  "name": "self-audit",
  "description": "Track autonomous decisions with confidence scores and cost/value analysis",
  "version": "1.0",
  "trigger": "after autonomous action"
}
```

## Decision Log Format

```json
{
  "timestamp": "2026-07-26T19:55:00Z",
  "action": "deployed_security_fixes",
  "confidence": 0.95,
  "cost_tokens": 15000,
  "estimated_value": "Prevented API key leak",
  "should_have_asked": false,
  "reversible": true,
  "undo_command": "git revert HEAD~3",
  "notes": "All tests passed, no external impact"
}
```

## Confidence Thresholds
- **0.90-1.00** → Act, report after
- **0.70-0.89** → Act, flag for review
- **0.50-0.69** → Ask first
- **<0.50** → Stop, escalate

## Weekly Report Template
```
🤖 Weekly Self-Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Actions Taken: X
Cost: Y tokens (€Z)
Confidence avg: W%
Should have asked: N times
Reverted: M actions

Top Decisions:
1. [Action] — Confidence 95% — ✅ Correct
2. [Action] — Confidence 70% — ⚠️ Flagged

Improvements Proposed:
- [Pattern] → New skill candidate
- [Mistake] → Updated decision rule
```

## Cost Tracking
| Model | Cost/1K tokens | Source |
|-------|----------------|--------|
| kimi-k2.6 | ~€0.003 | ollama-cloud |
| qwen3-coder | ~€0.001 | ollama-cloud |

## Files
- `logs/decisions.jsonl` — Append-only decision log
- `logs/weekly_audit.md` — Generated report
- `SKILL.md` — This file
