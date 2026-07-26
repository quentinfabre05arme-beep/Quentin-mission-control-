# 🤖 OpenClaw Multi-Agent Team

Autonomous agent team for maximum capability and parallel execution.

## Architecture

```
Orchestrator Agent (Route tasks, manage team)
    ├── Research Agent (Price fetch, news, TA)
    ├── System Agent (Health, cleanup, optimize)
    ├── Content Agent (Generate posts, schedule)
    └── Revenue Agent (Track sales, analytics)
```

## Agents

### 1. Research Agent (`research_agent.js`)
- **Schedule:** Every 4 hours
- **Tasks:**
  - Fetch cryptocurrency prices
  - Run technical analysis
  - Save results to `mission_control/research_results.json`

### 2. System Agent (`system_agent.js`)
- **Schedule:** Every 2 hours
- **Tasks:**
  - Monitor memory usage
  - Check disk space
  - Clean old logs
  - Kill Chrome if memory > 85%
  - Check OpenClaw health

### 3. Content Agent (`content_agent.js`)
- **Schedule:** Every 6 hours
- **Tasks:**
  - Generate content ideas
  - Create draft posts
  - Save to `content/drafts_YYYY-MM-DD.json`

### 4. Revenue Agent (`revenue_agent.js`)
- **Schedule:** Every 8 hours
- **Tasks:**
  - Track revenue metrics
  - Find business opportunities
  - Monitor POD/investment/content performance

## Usage

### Run All Agents
```bash
cd missions/agents
node orchestrator.js run
```

### Check Team Status
```bash
node orchestrator.js status
```

### Run Critical Priority Only
```bash
node orchestrator.js run-critical
```

### Individual Agents
```bash
node research_agent.js   # Research only
node system_agent.js     # System only
node content_agent.js    # Content only
node revenue_agent.js    # Revenue only
```

## State

Team state is stored in:
- `team_state.json` - Cycle count, agent statuses, timestamps
- `team_log.txt` - Execution log

## Integration

Add to OpenClaw cron for automatic execution:
```bash
# Run full team every 4 hours
openclaw cron add --name agent-team --schedule "0 */4 * * *" --command "node missions/agents/orchestrator.js run"
```

## Benefits

1. **Parallel execution** - All agents run simultaneously
2. **Fault tolerance** - One agent failing doesn't stop others
3. **Specialization** - Each agent focuses on one domain
4. **Scalability** - Easy to add more agents
5. **Monitoring** - Track each agent's performance
