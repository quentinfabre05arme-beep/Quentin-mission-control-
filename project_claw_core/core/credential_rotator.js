const fs = require('fs');
const path = require('path');

function shouldRotate(lastRotated, days = 90) {
  return new Date() - new Date(lastRotated) > days * 24 * 60 * 60 * 1000;
}

module.exports = { shouldRotate };