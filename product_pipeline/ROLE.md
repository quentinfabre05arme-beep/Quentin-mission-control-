# Product Pipeline Mission

## Purpose
Autonomous product creation, development, and launch tracking system.

## Responsibilities
1. **Ideation** — Collect, evaluate, and prioritize product ideas
2. **Development** — Track product through design → prototype → MVP → beta → launch stages
3. **Launch** — Schedule and coordinate product launches
4. **Analytics** — Record sales, user feedback, and performance metrics
5. **Strategy** — Suggest next products based on market gaps and performance data

## Data Model
- **Products**: Ideas with metadata, stage tracking, timeline
- **Stages**: `idea` → `research` → `design` → `prototype` → `mvp` → `beta` → `launched` → `sunset`
- **Launches**: Scheduled releases with marketing coordination
- **Sales**: Revenue, units, channels, trends
- **Reports**: Generated summaries of pipeline health

## Team Roles
| Role | Responsibilities |
|------|-----------------|
| PM | Strategy, prioritization, market research |
| Designer | UI/UX, prototyping, user testing |
| Engineer | Development, infrastructure, deployment |
| Marketer | Content, campaigns, analytics |

## File Outputs
All persistent data saved to `memory/` directory with timestamps.
