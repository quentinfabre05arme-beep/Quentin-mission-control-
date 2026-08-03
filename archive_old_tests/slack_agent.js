/**
 * PROJECT CLAW CORE — Slack Agent
 * Send messages to Slack via webhook (no bot token needed).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'slack_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class SlackAgent {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }
  
  async sendMessage(text, options = {}) {
    log(`Sending Slack message: ${text.slice(0, 100)}`);
    
    return new Promise((resolve, reject) => {
      const url = new URL(this.webhookUrl);
      const data = JSON.stringify({
        text,
        username: options.username || 'Claw',
        icon_emoji: options.icon || ':robot_face:',
        channel: options.channel
      });
      
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, output: body });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

module.exports = { SlackAgent };

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node slack_agent.js <webhook-url> [message]');
    process.exit(0);
  }
  const agent = new SlackAgent(url);
  agent.sendMessage(process.argv[3] || 'Claw test message').then(console.log).catch(console.error);
}
