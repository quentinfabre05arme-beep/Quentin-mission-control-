const os = require('os');
const p = require('child_process');

const t = os.totalmem() / 1e9, f = os.freemem() / 1e9;
console.log('RAM: ' + (t - f).toFixed(2) + ' / ' + t.toFixed(2) + ' GB (' + (((t - f) / t) * 100).toFixed(1) + '%)');

const disk = p.execSync('wmic logicaldisk get size,freespace,caption /format:csv').toString();
const lines = disk.split('\r\n').filter(l => l.trim() && l.includes('C:'));
if (lines.length) {
  const parts = lines[0].split(',');
  const free = parseInt(parts[2], 10), size = parseInt(parts[3], 10);
  console.log('C: total ' + Math.round(size / 1e9) + 'GB, free ' + Math.round(free / 1e9) + 'GB, used ' + (((size - free) / size) * 100).toFixed(1) + '%');
}

const nodes = p.execSync('tasklist /fi "imagename eq node.exe" /fo csv /nh').toString().split('\r\n').filter(Boolean).length;
console.log('node.exe processes: ' + nodes);
