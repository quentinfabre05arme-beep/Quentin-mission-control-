const fs = require('fs');

const today = new Date().toISOString().split('T')[0];
const scanFile = 'C:\\Users\\quent\\.openclaw\\workspace\\investment_fund\\opportunities\\scan_2026-07-24T08-14-40-117Z.json';
const outFile = `C:\\Users\\quent\\.openclaw\\workspace\\investment_fund\\opportunities\\queue_${today}.json`;

const data = JSON.parse(fs.readFileSync(scanFile, 'utf8'));
const top3 = data.opportunities.filter(x => x.asymmetryScore > 5)
                 .sort((a,b) => b.asymmetryScore - a.asymmetryScore)
                 .slice(0, 3);

fs.writeFileSync(outFile, JSON.stringify({date: today, opportunities: top3}, null, 2));
console.log('Queued ' + top3.length + ' opportunity (score >5) to ' + outFile);
