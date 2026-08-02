const fs = require('fs');

const inputFile = 'C:\\Users\\quent\\.openclaw\\workspace\\investment_fund\\opportunities\\scan_2026-07-24T08-29-39-909Z.json';
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const top = data.opportunities
  .filter(x => x.asymmetryScore > 5.0)
  .sort((a, b) => b.asymmetryScore - a.asymmetryScore)
  .slice(0, 3);

const now = new Date().toISOString();
const d = now.replace(/:/g, '-').split('.')[0];
const outputFile = `C:\\Users\\quent\\.openclaw\\workspace\\investment_fund\\opportunities\\queue_${d}.json`;

fs.writeFileSync(outputFile, JSON.stringify({ queued: top, date: now }, null, 2));
console.log('Queued', top.length, 'opportunities for review');
top.forEach(x => console.log('  -', x.ticker, 'Score:', x.asymmetryScore));
