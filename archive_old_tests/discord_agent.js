/**
 * PROJECT CLAW CORE — Discord Agent
 * Send messages to Discord via webhook.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'discord_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class DiscordAgent {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }
  
  async sendMessage(content, options = {}) {
    log(`Sending Discord message: ${content.slice(0, 100)}`);
    
    return new Promise((resolve, reject) => {
      const url = new URL(this.webhookUrl);
      const payload = {
        content,
        username: options.username || 'Claw',
        avatar_url: options.avatarUrl
      };
      if (options.embeds) payload.embeds = options.embeds;
      
      const data = JSON.stringify(payload);
      
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
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

module.exports = { DiscordAgent };

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node discord_agent.js <webhook-url> [message]');
    process.exit(0);
  }
  const agent = new DiscordAgent(url);
  agent.sendMessage(process.argv[3] || 'Claw test message').then(console.log).catch(console.error);
}
