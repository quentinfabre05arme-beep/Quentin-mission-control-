// Send cost update via Telegram
const { execSync } = require('child_process');

function sendUpdate() {
  try {
    // Get dashboard data
    const output = execSync('node usage_tracker.js dashboard', { encoding: 'utf8' });
    const data = JSON.parse(output);
    
    // Format message
    const message = `💰 API Usage Update

Status: ${data.status}
Today: $${data.todaySpent} / $${data.dailyBudget}
Percent: ${data.percentUsed}
Remaining: $${data.remaining}
Est. Monthly: $${data.estimatedMonthly}

Top Model: ${Object.entries(data.byModel).sort((a,b) => b[1].cost - a[1].cost)[0][0].replace('ollama-cloud/', '')}`;

    // Send via OOMOL (if telegram connector available) or save to file
    console.log(message);
    
    // Save to notification file
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\quent\\.openclaw\\workspace\\notifications\\cost_update.txt', message);
    
    return { success: true, message };
  } catch (e) {
    console.error('Failed to send update:', e.message);
    return { success: false, error: e.message };
  }
}

if (require.main === module) {
  sendUpdate();
}

module.exports = sendUpdate;
