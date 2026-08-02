#!/bin/bash
# Alpha Fund v3.0 — Auto-Improvement Runner
# Runs every hour via cron

echo "🔁 $(date): Starting improvement cycle..."

cd "$(dirname "$0")/.."

# Phase 1: TEST
echo "Phase 1: Testing system..."
node orchestrator.js status > logs/status_$(date +%Y%m%d_%H%M).log 2>&1
if [ $? -ne 0 ]; then
    echo "❌ System status failed — needs fix"
    # Try to fix
    node -e "require('./orchestrator').COMMANDS.status()" 2>&1 | head -20
fi

# Phase 2: VERIFY TRADES
echo "Phase 2: Verifying trades..."
node -e "
const fs = require('fs');
const portfolio = JSON.parse(fs.readFileSync('data/portfolio.json', 'utf8'));
console.log('Positions:', portfolio.positions.length);
console.log('Cash: $' + portfolio.cash.toFixed(2));
console.log('Trades:', portfolio.trades.length);
" 2>&1

# Phase 3: CHECK FOR ERRORS
echo "Phase 3: Checking logs..."
if [ -f logs/errors.log ]; then
    tail -5 logs/errors.log
fi

# Phase 4: QUICK FIX (if needed)
# This section intentionally left for AI to fill dynamically

echo "✅ $(date): Improvement cycle complete"
