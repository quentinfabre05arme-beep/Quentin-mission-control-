/**
 * PROJECT CLAW CORE — RSS Agent
 * Read RSS/Atom feeds and extract articles.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'rss_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function fetchXml(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    let data = '';
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRss(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const link = block.match(/<link>(.*?)<\/link>/);
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/);
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
    
    items.push({
      title: title ? (title[1] || title[2]).trim() : '',
      link: link ? link[1].trim() : '',
      date: pubDate ? pubDate[1].trim() : '',
      description: desc ? (desc[1] || desc[2]).replace(/<[^\u003e]*>/g, ' ').trim().slice(0, 300) : ''
    });
  }
  return items;
}

class RssAgent {
  async read(url, maxItems = 10) {
    log(`Reading RSS: ${url}`);
    const xml = await fetchXml(url);
    const items = parseRss(xml);
    return items.slice(0, maxItems);
  }
  
  async readMultiple(feeds, maxItems = 5) {
    const results = {};
    for (const feed of feeds) {
      try {
        results[feed] = await this.read(feed, maxItems);
      } catch(e) {
        results[feed] = { error: e.message };
      }
    }
    return results;
  }
  async readFeed(url, maxItems = 10) {
    return await this.read(url || 'https://techcrunch.com/feed/', maxItems);
  }
}

module.exports = { RssAgent, parseRss };

if (require.main === module) {
  (async () => {
    const agent = new RssAgent();
    const items = await agent.read('https://feeds.feedburner.com/TechCrunch/', 3);
    console.log(JSON.stringify(items, null, 2));
  })();
}
