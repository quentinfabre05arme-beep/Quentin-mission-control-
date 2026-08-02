const fs = require('fs');
const path = require('path');

function generateDocs(files) {
  return files.map(f => ({ file: f, doc: 'Auto-generated doc placeholder' }));
}

module.exports = { generateDocs };