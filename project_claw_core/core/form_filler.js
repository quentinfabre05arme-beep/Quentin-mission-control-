const { execSync } = require('child_process');

function typeText(text) {
  // Placeholder for keyboard automation
  return { success: false, reason: 'Need active window handle' };
}

module.exports = { typeText };