// Web Server for Dashboard
// Serves dashboard on local network + generates live data

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WORKSPACE = path.resolve(__dirname, '..');

class DashboardServer {
  constructor() {
    this.server = null;
  }

  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(50));
      console.log('🚀 DASHBOARD SERVER LIVE');
      console.log('='.repeat(50));
      console.log(`Local: http://localhost:${PORT}`);
      
      // Get network IP
      const networkIP = this.getNetworkIP();
      if (networkIP) {
        console.log(`Network: http://${networkIP}:${PORT}`);
        console.log(`Phone: http://${networkIP}:${PORT}`);
      }
      
      console.log('='.repeat(50));
      console.log('Press Ctrl+C to stop');
    });
  }

  getNetworkIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168')) {
          return iface.address;
        }
      }
    }
    return null;
  }

  handleRequest(req, res) {
    const url = req.url === '/' ? '/interactive_dashboard.html' : req.url;
    const filePath = path.join(WORKSPACE, 'mission_control', url.split('?')[0]);

    if (url === '/api/status') {
      this.serveAPI(req, res);
      return;
    }

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json'
      }[ext] || 'text/plain';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  serveAPI(req, res) {
    const status = {
      timestamp: new Date().toISOString(),
      goals: {
        ai_agent: 95,
        learning: 25,
        revenue: 75,
        dscg: 12,
        trading: 60
      },
      systems: {
        built: 8,
        total: 9
      },
      missions: 17,
      skills: 37,
      revenue: 14900,
      dscg_days: 293,
      trading_pnl: 2.3
    };

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(status, null, 2));
  }
}

// CLI
if (require.main === module) {
  const server = new DashboardServer();
  server.start();
}

module.exports = DashboardServer;
