# OpenClaw Revenue System Deployment Guide
## Version 1.0 | July 25, 2026

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Git
- Domain name (for production)
- SSL certificate (for production)

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/openclaw/revenue-system.git
cd revenue-system

# 2. Create environment file
cp .env.example .env
# Edit .env with your API keys

# 3. Create data directories
mkdir -p data logs reports

# 4. Start services
docker-compose up -d

# 5. Verify health
curl http://localhost:3000/health
```

### Environment Variables

```env
# Database
DB_PASSWORD=your_secure_password

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# APIs
TWELVE_DATA_API_KEY=your_key
SERPER_API_KEY=your_key
OPENAI_API_KEY=your_key

# Monitoring
GRAFANA_PASSWORD=your_password

# Notifications
TELEGRAM_BOT_TOKEN=your_token
SENDGRID_API_KEY=your_key
```

---

## Deployment Environments

### Development (Local)
- Single node
- SQLite/JSON storage
- No SSL
- Debug logging

### Staging (VPS)
- Docker Compose
- PostgreSQL + Redis
- Self-signed SSL
- Basic monitoring

### Production (Cloud)
- Kubernetes cluster
- Managed PostgreSQL
- CDN + Load Balancer
- Full monitoring stack

---

## Production Deployment

### Step 1: Infrastructure Setup

```bash
# Create cloud VPS (4 CPU, 8GB RAM minimum)
# Recommended: DigitalOcean, AWS, or Hetzner

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: SSL Certificate

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d api.openclaw.ai

# Copy certificates
cp /etc/letsencrypt/live/api.openclaw.ai/fullchain.pem ./nginx/ssl/
cp /etc/letsencrypt/live/api.openclaw.ai/privkey.pem ./nginx/ssl/
```

### Step 3: Database Setup

```bash
# Initialize database
docker-compose exec postgres psql -U openclaw -d openclaw -f /init/schema.sql

# Create indexes
docker-compose exec postgres psql -U openclaw -d openclaw -f /init/indexes.sql
```

### Step 4: Start Services

```bash
# Pull latest images
docker-compose pull

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale API servers
docker-compose up -d --scale api-server=3
```

### Step 5: Verification

```bash
# Check service health
curl https://api.openclaw.ai/health

# Test API endpoint
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.openclaw.ai/market-data?symbol=BTC

# View logs
docker-compose logs -f api-server
```

---

## Monitoring Setup

### Prometheus Metrics

Access at: http://localhost:9090

Key metrics:
- `revenue_total`: Total revenue generated
- `api_requests_total`: API request count
- `api_response_time_seconds`: Response latency
- `active_subscriptions`: Current subscriber count
- `system_memory_usage`: Memory utilization

### Grafana Dashboards

Access at: http://localhost:3001

Default dashboards:
- Revenue Overview
- API Performance
- System Health
- Business Metrics

### Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: revenue_alerts
    rules:
      - alert: RevenueDrop
        expr: revenue_total < revenue_total offset 1d * 0.8
        for: 1h
        annotations:
          summary: "Revenue drop detected"
          
      - alert: HighErrorRate
        expr: rate(api_errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"
```

---

## Backup Strategy

### Automated Backups

```bash
# Database backup
docker-compose exec postgres pg_dump -U openclaw openclaw > backup_$(date +%Y%m%d).sql

# Data directory backup
tar -czf data_backup_$(date +%Y%m%d).tar.gz ./data

# Upload to S3 (configure AWS CLI)
aws s3 cp backup_$(date +%Y%m%d).sql s3://openclaw-backups/
```

### Backup Schedule
- Database: Daily at 02:00 UTC
- Files: Weekly on Sunday
- Retention: 30 days

### Disaster Recovery

```bash
# Restore database
docker-compose exec -T postgres psql -U openclaw < backup_20260725.sql

# Restore data
tar -xzf data_backup_20260725.tar.gz
```

---

## Scaling Guide

### Horizontal Scaling

```bash
# Scale API servers
docker-compose up -d --scale api-server=5

# Add load balancer
# See nginx/load-balancer.conf

# Database read replicas
# Configure in docker-compose.yml
```

### Vertical Scaling

```yaml
# docker-compose.override.yml
services:
  api-server:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 2G
  postgres:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
```

---

## Security Hardening

### Network Security
- Firewall rules (allow only 80, 443, 22)
- DDoS protection (Cloudflare)
- VPN for admin access

### Application Security
- API key rotation every 90 days
- Rate limiting per tier
- Input validation
- SQL injection prevention

### Data Security
- Encryption at rest (AES-256)
- TLS 1.3 for all communications
- Regular security audits
- GDPR compliance

---

## Troubleshooting

### Common Issues

**Issue:** API returns 429 Too Many Requests
**Solution:** Check rate limits, upgrade tier, or implement caching

**Issue:** Database connection errors
**Solution:** Verify PostgreSQL is running, check credentials

**Issue:** High memory usage
**Solution:** Restart services, increase limits, or optimize queries

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Enter container
docker-compose exec api-server /bin/sh

# Check database
docker-compose exec postgres psql -U openclaw -d openclaw
```

### Health Checks

```bash
# System health
curl http://localhost:3000/health

# Database health
docker-compose exec postgres pg_isready -U openclaw

# Redis health
docker-compose exec redis redis-cli ping
```

---

## Maintenance Windows

### Weekly Tasks
- Review error logs
- Check metrics dashboard
- Update dependencies
- Verify backups

### Monthly Tasks
- Security updates
- Performance optimization
- Cost review
- Capacity planning

### Quarterly Tasks
- Disaster recovery drill
- Security audit
- Infrastructure review
- Documentation updates

---

## Support

For issues or questions:
- Documentation: https://docs.openclaw.ai
- Status: https://status.openclaw.ai
- Support: support@openclaw.ai

---

**Document Status:** COMPLETE
**Last Updated:** July 25, 2026
**Next Review:** August 25, 2026
