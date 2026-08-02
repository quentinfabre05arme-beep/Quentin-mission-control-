/**
 * PROJECT CLAW CORE — Content Factory
 * Generate simple content from templates.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'content_factory.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ContentFactory {
  fromTemplate(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }
  
  generateReport(title, sections) {
    const body = sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n');
    return `# ${title}\n\n${body}`;
  }
  
  generateSocialPost(asset, signal, price) {
    const templates = [
      `${asset} at $${price} — ${signal}. Watching closely.`,
      `Market signal: ${signal} ${asset} @ $${price}. Not financial advice.`,
      `${asset} update: $${price}. Regime: ${signal}.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  saveContent(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return { success: true, path: filePath };
  }
}

module.exports = { ContentFactory };

if (require.main === module) {
  const factory = new ContentFactory();
  console.log(factory.generateSocialPost('BTC', 'bullish', 63258));
}
