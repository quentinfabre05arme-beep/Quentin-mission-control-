const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'index.html';
let content = fs.readFileSync(filePath, 'utf8');

// Update activity feed
content = content.replace(/Maintenance Sweep #135 Complete/g, 'Maintenance Sweep #187 Complete');
content = content.replace(/00:01/g, '06:02');
content = content.replace(/03:11/g, '06:02');
content = content.replace(/Market Data Refreshed/g, 'System Maintenance Complete');

// Update timestamp in header
const now = new Date();
const parisTime = now.toLocaleString('en-CA', { timeZone: 'Europe/Paris', hour12: false }).replace(', ', 'T');
const isoParis = parisTime.slice(0, 16);

// Update meta last-review
content = content.replace(
  /meta name="last-review" content="[^"]*"/,
  `meta name="last-review" content="${isoParis}:00+02:00"`
);

fs.writeFileSync(filePath, content);
console.log('Updated:', filePath);
