/**
 * CATALYST WATCHER — Monitors upcoming events that could move prices
 * Scrapes earnings calendars, FDA decisions, product launches, etc.
 * Triggers deep dives when catalysts approach
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  CATALYST_FILE: path.join(__dirname, '..', 'data', 'catalysts.json'),
  WATCH_DAYS_AHEAD: 7,
  HIGH_PRIORITY_TICKERS: ['NVDA', 'TSLA', 'PLTR', 'MSTR', 'COIN', 'AAPL']
};

// Mock catalyst database (replace with live scrapers)
const CATALYST_DB = [
  { ticker: 'TSLA', date: '2026-07-25', event: 'Q2 Earnings', impact: 'high', type: 'earnings' },
  { ticker: 'NVDA', date: '2026-07-30', event: 'SIGGRAPH Conference', impact: 'medium', type: 'conference' },
  { ticker: 'PLTR', date: '2026-08-05', event: 'Government Contract Award', impact: 'high', type: 'contract' },
  { ticker: 'MSTR', date: '2026-07-28', event: 'BTC Treasury Update', impact: 'medium', type: 'update' },
  { ticker: 'AAPL', date: '2026-07-29', event: 'Q3 Earnings', impact: 'high', type: 'earnings' },
  { ticker: 'COIN', date: '2026-08-01', event: 'Institutional Platform Launch', impact: 'high', type: 'product' }
];

function getUpcomingCatalysts(daysAhead = CONFIG.WATCH_DAYS_AHEAD) {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysAhead);
  
  return CATALYST_DB.filter(c => {
    const eventDate = new Date(c.date);
    return eventDate >= today && eventDate <= future;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function runWatcher() {
  console.log(`\n📅 CATALYST WATCHER — Next ${CONFIG.WATCH_DAYS_AHEAD} days\n`);
  
  const upcoming = getUpcomingCatalysts();
  
  if (upcoming.length === 0) {
    console.log('No major catalysts in the next 7 days.');
    return;
  }
  
  console.log('| Date       | Ticker | Event                          | Impact | Days | Action |');
  console.log('|------------|--------|--------------------------------|--------|------|--------|');
  
  const today = new Date();
  
  for (const c of upcoming) {
    const eventDate = new Date(c.date);
    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    const isPriority = CONFIG.HIGH_PRIORITY_TICKERS.includes(c.ticker);
    const action = daysUntil <= 2 ? '🔴 ENTER NOW' : (isPriority ? '🟡 PREPARE' : '⚪ WATCH');
    
    console.log(
      `| ${c.date} | ${c.ticker.padEnd(6)} | ${c.event.slice(0, 30).padEnd(30)} | ` +
      `${c.impact.padEnd(6)} | ${daysUntil.toString().padStart(3)}d | ${action} |`
    );
    
    if (isPriority && daysUntil <= 3) {
      console.log(`   ⚠️  Priority ticker ${c.ticker} has catalyst in ${daysUntil} days — consider position`);
    }
  }
  
  // Save to file
  fs.writeFileSync(CONFIG.CATALYST_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    catalysts: upcoming
  }, null, 2));
  
  console.log(`\n💾 Saved to: ${CONFIG.CATALYST_FILE}`);
}

if (require.main === module) {
  runWatcher();
}

module.exports = { getUpcomingCatalysts, runWatcher };
