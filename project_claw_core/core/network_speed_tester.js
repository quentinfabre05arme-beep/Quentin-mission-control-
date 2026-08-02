/**
 * PROJECT CLAW CORE — Network Speed Tester
 * Measure download speed by fetching a test file.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'network_speed_tester.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function measureDownload(url, timeoutMs = 15000) {
  log(`Speed test: ${url}`);
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const start = Date.now();
    let bytes = 0;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      res.on('data', chunk => { bytes += chunk.length; });
      res.on('end', () => {
        const elapsed = (Date.now() - start) / 1000;
        const mbps = (bytes * 8 / 1000000) / elapsed;
        resolve({ success: true, url, bytes, seconds: elapsed, mbps: mbps.toFixed(2) });
      });
      res.on('error', e => resolve({ success: false, error: e.message }));
    });
    req.on('error', e => resolve({ success: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
  });
}

class NetworkSpeedTester {
  async test(url = 'https://speed.hetzner.de/100MB.bin') {
    return await measureDownload(url);
  }
}

module.exports = { NetworkSpeedTester, measureDownload };

if (require.main === module) {
  const tester = new NetworkSpeedTester();
  tester.test('https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png').then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
