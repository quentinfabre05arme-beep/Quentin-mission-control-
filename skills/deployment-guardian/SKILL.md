# 🚀 Deployment Guardian Skill

**Description:** Safe deployments with staging tests and automatic rollback.

## Workflow

### 1. Pre-Deploy Checks
- Run tests
- Check git status
- Verify config
- Backup current state

### 2. Staging Deploy
- Deploy to staging
- Run smoke tests
- Verify endpoints
- Check logs

### 3. Production Deploy
- Ask user for approval
- Deploy with zero downtime
- Monitor for errors
- Auto-rollback if issues

### 4. Post-Deploy
- Monitor for 30 min
- Check error rates
- Verify performance
- Report status

## Auto-Rollback Triggers
- Error rate > 1%
- Response time > 2x baseline
- Any 5xx errors in first 5 min
- User reports issues

## Safety Features
- Git tags before deploy
- Database backups
- Config backups
- Quick rollback command
