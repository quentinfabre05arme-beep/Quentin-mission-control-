const fs = require('fs');
const path = require('path');

function consolidate(memory) {
  // Remove outdated facts
  return memory.filter(f => new Date(f.created) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
}

module.exports = { consolidate };