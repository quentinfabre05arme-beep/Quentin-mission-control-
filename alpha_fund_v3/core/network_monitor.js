#!/usr/bin/env node
/**
 * 🌐 NETWORK MONITOR
 * Bandwidth, connections, latency monitoring
 */

const { execSync } = require('child_process');
const os = require('os');

// ─── GET CONNECTIONS ──────────────────────────────────────
function getConnections() {
  try {
    const result = execSync('netstat -an', { encoding: 'utf8', timeout: 10000 });
    const lines = result.split('\n').filter(l => l.includes('ESTABLISHED'));
    return {
      total: lines.length,
      byPort: lines.reduce((acc, line) => {
        const port = line.split(':').pop()?.split(' ')[0];
        if (port) acc[port] = (acc[port] || 0) + 1;
        return acc;
      }, {})
    };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── GET BANDWIDTH ──────────────────────────────────────────
function getBandwidth() {
  try {
    const result = execSync('powershell -c "Get-NetAdapterStatistics | Select-Object Name,ReceivedBytes,SentBytes | Format-Table -AutoSize"', { 
      encoding: 'utf8', 
      timeout: 10000 
    });
    return { raw: result };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── PING TEST ──────────────────────────────────────────────
function ping(host = '8.8.8.8') {
  try {
    const result = execSync(`ping -n 1 ${host}`, { encoding: 'utf8', timeout: 10000 });
    const match = result.match(/time[=<](\d+)ms/);
    return {
      host,
      alive: result.includes('Reply from'),
      latency: match ? parseInt(match[1]) : null,
      raw: result.split('\n')[1] || ''
    };
  } catch(e) {
    return { host, alive: false, error: e.message };
  }
}

// ─── NETWORK INTERFACES ────────────────────────────────────
function getInterfaces() {
  const interfaces = os.networkInterfaces();
  return Object.entries(interfaces).map(([name, addrs]) => ({
    name,
    addresses: addrs.map(a => ({
      address: a.address,
      family: a.family,
      internal: a.internal
    }))
  })).filter(i => !i.addresses.every(a => a.internal));
}

// ─── INTERNET CHECK ───────────────────────────────────────
function isOnline() {
  const google = ping('google.com');
  const cloudflare = ping('1.1.1.1');
  return {
    online: google.alive || cloudflare.alive,
    google: google.latency,
    cloudflare: cloudflare.latency,
    timestamp: new Date().toISOString()
  };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = {
  getConnections,
  getBandwidth,
  ping,
  getInterfaces,
  isOnline
};

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🌐 Network Monitor');
  console.log('');
  
  console.log('Internet check:');
  const online = isOnline();
  console.log(`  Online: ${online.online ? '✅' : '❌'}`);
  console.log(`  Google: ${online.google}ms`);
  console.log(`  Cloudflare: ${online.cloudflare}ms`);
  
  console.log('');
  console.log('Network interfaces:');
  getInterfaces().forEach(i => {
    const ip = i.addresses.find(a => a.family === 'IPv4' && !a.internal);
    if (ip) console.log(`  ${i.name}: ${ip.address}`);
  });
  
  console.log('');
  console.log('Active connections:', getConnections().total || 'N/A');
  
  console.log('');
  console.log('Network monitor ready');
}
