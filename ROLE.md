# Learning Tracker Mission

## Overview
The Learning Tracker is a lightweight, file-based system to track personal learning journeys across multiple subjects.

## Purpose
- Maintain visibility into what is being learned
- Log study sessions with duration, topic, and notes
- Measure progress over time
- Surface the next logical topic to study

## Responsibilities
1. **Track Subjects** — Maintain a list of active learning subjects with metadata
2. **Log Sessions** — Record every study session with date, duration, topic, and quality rating
3. **Measure Progress** — Compute time spent, session count, and completion percentage per subject
4. **Suggest Next Topics** — Recommend the next topic based on progress gaps or dependencies

## Data Model

### Subject
```json
{
  "id": "js-async",
  "name": "JavaScript Async Patterns",
  "category": "Programming",
  "status": "active",
  "priority": 1,
  "dependencies": ["js-promises"],
  "estimated_hours": 10,
  "completed_hours": 3.5,
  "sessions_count": 4
}
```

### Session
```json
{
  "id": "session-001",
  "subject_id": "js-async",
  "date": "2026-07-26",
  "duration_minutes": 45,
  "topic": "Promise.all vs Promise.allSettled",
  "rating": 4,
  "notes": "Need more practice with error handling"
}
```

## Files
- `team_state.json` — Mission state and config
- `memory/learning/subjects.json` — Subject registry
- `memory/learning/sessions.json` — Session log
- `memory/learning/progress.json` — Computed progress snapshots
- `learning_tracker.js` — Core script

## Usage
```bash
node learning_tracker.js --help
node learning_tracker.js add-subject "Rust Ownership" "Programming" --priority=2 --hours=15
node learning_tracker.js log "js-async" 45 "Promise chaining" --rating=5
node learning_tracker.js progress
node learning_tracker.js suggest
```
