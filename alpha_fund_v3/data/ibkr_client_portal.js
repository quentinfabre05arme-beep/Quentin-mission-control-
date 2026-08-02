/**
 * Interactive Brokers Client Portal API Connector
 * Alternative to TWS/IB Gateway — uses REST API via local Client Portal
 * 
 * Setup:
 1. Download IBKR Client Portal from https://www.interactivebrokers.com/en/index.php?f=16457
 * 2. Run it locally (defaults to https://localhost:5000)
 * 3. Authenticate with IBKR credentials in browser
 * 4. This connector will call the REST endpoints
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CLIENT_PORTAL_CONFIG = {
  host: 'localhost',
  port: 5000,
  basePath: '/v1/api',
  enabled: false,  // Set to true after Client Portal is running
  rejectUnauthorized: false // Client Portal uses self-signed cert
};

const CACHE_FILE = path.join(__dirname, '..', 'data', 'ibkr_client_portal_cache.json');

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CLIENT_PORTAL_CONFIG.host,
      port: CLIENT_PORTAL_CONFIG.port,
      path: `${CLIENT_PORTAL_CONFIG.basePath}${endpoint}`,
      method: 'GET',
      rejectUnauthorized: CLIENT_PORTAL_CONFIG.rejectUnauthorized
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Client Portal request timeout'));
    });
    req.end();
  });
}

async function fetchSnapshot(tickers) {
  if (!CLIENT_PORTAL_CONFIG.enabled) {
    console.log('⚠️ Client Portal not enabled');
    return null;
  }

  try {
    const conids = await getConids(tickers);
    if (!conids || conids.length === 0) return null;

    const fields = '31,83';
    const response = await makeRequest(`/iserver/marketdata/snapshot?conids=${conids.join(',')}&fields=${fields}`);
    
    const prices = {};
    if (Array.isArray(response)) {
      response.forEach(item => {
        const ticker = item.symbol || item.conid;
        if (ticker) {
          prices[ticker] = {
            price: item['31'] || item['85'] || 0,
            change_24h: item['83'] || 0,
            source: 'IBKR-CP',
            timestamp: new Date().toISOString()
          };
        }
      });
    }

    return prices;
  } catch (e) {
    console.error('❌ Client Portal error:', e.message);
    return null;
  }
}

async function getConids(tickers) {
  const conids = [];
  for (const ticker of tickers) {
    try {
      const search = await makeRequest(`/iserver/secdef/search?symbol=${ticker}&name=${ticker}&secType=STK`);
      if (search && search.length > 0 && search[0].conid) {
        conids.push(search[0].conid);
      }
    } catch (e) {}
  }
  return conids;
}

async function getPricesWithFallback(tickers) {
  const snapshot = await fetchSnapshot(tickers);
  if (snapshot) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ prices: snapshot, timestamp: new Date().toISOString() }, null, 2));
    return snapshot;
  }

  if (fs.existsSync(CACHE_FILE)) {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - new Date(cached.timestamp).getTime() < 5 * 60 * 1000) {
      console.log('📦 Using cached Client Portal prices');
      return cached.prices;
    }
  }

  return null;
}

function checkStatus() {
  return makeRequest('/iserver/auth/status');
}

if (require.main === module) {
  if (process.argv[2] === 'test') {
    CLIENT_PORTAL_CONFIG.enabled = true;
    checkStatus().then(status => {
      console.log('Auth status:', status);
      return fetchSnapshot(['AAPL', 'TSLA']);
    }).then(prices => {
      console.log('Prices:', prices);
    }).catch(console.error);
  } else {
    console.log('IBKR Client Portal Connector');
    console.log('Run: node ibkr_client_portal.js test');
  }
}

module.exports = {
  fetchSnapshot,
  getPricesWithFallback,
  checkStatus,
  CLIENT_PORTAL_CONFIG
};
