const fs = require('fs');
const path = require('path');

function collectFeedback(action, result) {
  return { action, result, timestamp: new Date().toISOString() };
}

module.exports = { collectFeedback };