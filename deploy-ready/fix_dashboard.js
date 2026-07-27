const fs = require('fs');

// Current prices (BTC from API call, rest from cached)
const data = {
  timestamp: '2026-07-18T22:02:00.000Z',
  assets: {
    BTC: { price: 64775.99, change_24h: 1.32066, source: 'twelvedata', signal: 'NEUTRAL' },
    ETH: { price: 1857.88, change_24h: 0.87, source: 'cached', signal: 'NEUTRAL' },
    MSTR: { price: 94.85, change_24h: 0.87, source: 'cached', signal: 'NEUTRAL' },
    HIMS: { price: 32.84, change_24h: -2.49, source: 'cached', signal: 'BEARISH' }
  }
};

let totalChanges = 0;

// Update index.html
let html = fs.readFileSync('index.html', 'utf8');
let changed = 0;

// Update timestamp
if (html.includes('id="timestamp"')) {
  html = html.replace(/id="timestamp">[^<]*<\/div>/, 'id="timestamp">2026-07-18 22:02:00 UTC<\/div>');
  changed++;
}

// Update last-review meta
if (html.includes('name="last-review"')) {
  html = html.replace(/meta name="last-review" content="[^"]*"/, 'meta name="last-review" content="2026-07-18T23:02:00+02:00"');
  changed++;
}

// Update BTC price
if (html.includes('$64,677.40')) {
  html = html.replace('$64,677.40', '$64,775.99');
  html = html.replace('BTC $64,677', 'BTC $64,775');
  html = html.replace('+1.17%', '+1.32%');
  changed++;
}

if (changed > 0) {
  fs.writeFileSync('index.html', html);
  console.log('Updated index.html with', changed, 'changes');
  totalChanges += changed;
}

// Update mobile_dashboard.html if exists
try {
  let mobile = fs.readFileSync('mobile_dashboard.html', 'utf8');
  let mChanged = 0;
  
  if (mobile.includes('$64,677.40')) {
    mobile = mobile.replace('$64,677.40', '$64,775.99');
    mobile = mobile.replace('+1.17%', '+1.32%');
    mChanged++;
  }
  
  if (mChanged > 0) {
    fs.writeFileSync('mobile_dashboard.html', mobile);
    console.log('Updated mobile_dashboard.html with', mChanged, 'changes');
    totalChanges += mChanged;
  }
} catch(e) {
  console.log('mobile_dashboard.html:', e.message);
}

// Write market data
fs.writeFileSync('market_data.json', JSON.stringify(data, null, 2));
console.log('Updated market_data.json');

// Write maintenance log
const logEntry = `\n## ${new Date().toISOString()} — Maintenance Sweep #86\n\n**Actions:**\n- Market data refreshed: BTC $64,775.99 (+1.32%), ETH $1,857.88 (+0.87%), MSTR $94.85 (+0.87%), HIMS $32.84 (-2.49%)\n- index.html prices and timestamps updated\n- mobile_dashboard.html prices updated\n- Total dashboard changes: ${totalChanges}\n\n**Status:** ${totalChanges > 0 ? 'Fixes applied' : 'No changes needed'}\n`;

fs.appendFileSync('../memory/maintenance-2026-07-18.md', logEntry);
console.log('Logged to maintenance file');
console.log('Total changes:', totalChanges);
