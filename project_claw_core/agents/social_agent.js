/**
 * PROJECT CLAW CORE — Social Agent
 * Cross-platform social content dispatcher.
 */

const { SlackAgent } = require('./slack_agent');
const { DiscordAgent } = require('./discord_agent');
const { XAgent } = require('./x_agent');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'social_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class SocialAgent {
  constructor(config = {}) {
    this.config = config;
  }
  
  async dispatch(platform, message, options = {}) {
    log(`Dispatching to ${platform}: ${message.slice(0, 100)}`);
    
    if (platform === 'slack' && this.config.slackWebhook) {
      const agent = new SlackAgent(this.config.slackWebhook);
      return await agent.sendMessage(message, options);
    }
    
    if (platform === 'discord' && this.config.discordWebhook) {
      const agent = new DiscordAgent(this.config.discordWebhook);
      return await agent.sendMessage(message, options);
    }
    
    if (platform === 'x') {
      const agent = new XAgent();
      try {
        await agent.init();
        const result = await agent.post(message);
        await agent.close();
        return result;
      } catch(e) {
        return { success: false, error: e.message };
      }
    }
    
    return { success: false, error: `No credentials/config for ${platform}` };
  }
}

module.exports = { SocialAgent };

if (require.main === module) {
  const agent = new SocialAgent({ slackWebhook: process.env.SLACK_WEBHOOK });
  agent.dispatch('slack', 'Test from Claw SocialAgent').then(console.log).catch(console.error);
}
