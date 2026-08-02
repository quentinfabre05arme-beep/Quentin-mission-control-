/**
 * PROJECT CLAW CORE — Web Monitor
 * Check if websites are up/down with latency and status code.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'web_monitor.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function checkUrl(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      const latency = Date.now() - start;
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          latency_ms: latency,
          up: res.statusCode >= 200 && res.statusCode < 400,
          size: body.length
        });
      });
    });
    
    req.on('error', (e) => {
      resolve({ url, status: 0, latency_ms: Date.now() - start, up: false, error: e.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 0, latency_ms: timeoutMs, up: false, error: 'Timeout' });
    });
  });
}

class WebMonitor {
  constructor() {
    this.history = [];
  }
  
  async check(urls) {
    const results = [];
    for (const url of urls) {
      const result = await checkUrl(url);
      results.push(result);
      log(`${result.url} → ${result.up ? 'UP' : 'DOWN'} (${result.status}) ${result.latency_ms}ms`);
    }
    this.history.push({ timestamp: new Date().toISOString(), results });
    return results;
  }
  
  async checkCommon() {
    return await this.check([
      'https://www.google.com',
      'https://github.com',
      'https://outlook.live.com',
      'https://x.com',
      'https://api.telegram.org'
    ]);
  }
  
  getDownSites() {
    if (this.history.length === 0) return [];
    const last = this.history[this.history.length - 1];
    return last.results.filter(r => !r.up);
  }
}

module.exports = { WebMonitor, checkUrl };

if (require.main === module) {
  (async () => {
    const monitor = new WebMonitor();
    const results = await monitor.checkCommon();
    console.log(JSON.stringify(results, null, 2));
  })();
}
