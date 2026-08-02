const fs = require('fs');
const path = require('path');

function organizeDownloads(downloadDir) {
  const files = fs.readdirSync(downloadDir).filter(f => fs.statSync(path.join(downloadDir, f)).isFile());
  return { moved: files.length };
}

module.exports = { organizeDownloads };