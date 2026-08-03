/**
 * PROJECT CLAW CORE — Proxy Server Agent
 * Start/stop a local HTTP proxy.
 */

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'proxy_server_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class ProxyServerAgent {
  constructor() {
    this.server = null;
  }
  
  start(port = 3128) {
    log(`Starting proxy on port ${port}`);
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        log(`Proxy request: ${req.url}`);
        const [host, targetPort] = req.url.replace(/^https?:\/\//, '').split(':');
        const client = net.connect(targetPort || 80, host, () => {
          req.pipe(client);
          client.pipe(res);
        });
        client.on('error', e => {
          res.writeHead(502);
          res.end('Proxy error: ' + e.message);
        });
      });
      
      this.server.listen(port, () => {
        resolve({ success: true, port });
      });
      this.server.on('error', reject);
    });
  }
  
  stop() {
    log('Stopping proxy');
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve({ success: true }));
      } else {
        resolve({ success: false, error: 'Proxy not running' });
      }
    });
  }
}

module.exports = { ProxyServerAgent };

if (require.main === module) {
  const proxy = new ProxyServerAgent();
  proxy.start(3129).then(r => {
    console.log(JSON.stringify(r, null, 2));
    setTimeout(() => proxy.stop().then(s => console.log(s)), 1000);
  }).catch(console.error);
}
