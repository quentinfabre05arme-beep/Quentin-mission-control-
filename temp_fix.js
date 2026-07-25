const fs = require('fs');
let h = fs.readFileSync('mission_control/index.html', 'utf8');
h = h.replace(/content="2026-07-25T18:01:00\+02:00"/g, 'content="2026-07-26T00:01:00+02:00"');
h = h.replace(/content="216"/g, 'content="217"');
fs.writeFileSync('mission_control/index.html', h);
console.log('Updated index.html: last-review + cycle 217');
