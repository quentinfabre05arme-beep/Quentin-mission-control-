const fs = require('fs');
const path = require('path');

function optimizeStrategy(history) {
  // Simple: pick strategy with best win rate
  return history.sort((a, b) => b.winRate - a.winRate)[0];
}

module.exports = { optimizeStrategy };