const https = require('https');
const fs = require('fs');
const path = require('path');

// Fix: load .env from script's own directory
const SCRIPT_DIR = __dirname;
const ENV_PATH = path.join(SCRIPT_DIR, '.env');

console.log('📍 Script directory:', SCRIPT_DIR);
console.log('🔑 Looking for .env at:', ENV_PATH);

if (!fs.existsSync(ENV_PATH)) {
  console.error('❌ .env not found');
  process.exit(1);
}

const envLines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
let TOKEN = null;
for (const line of envLines) {
  if (line.startsWith('PRINTIFY_API_KEY=')) {
    TOKEN = line.substring('PRINTIFY_API_KEY='.length).trim();
    break;
  }
}

const SHOP_ID = 28241288;

if (!TOKEN) {
  console.error('❌ Token not found in .env');
  process.exit(1);
}

console.log('✅ Token loaded:', TOKEN.substring(0, 30) + '...');
console.log('🏪 Shop ID:', SHOP_ID);

// Test API connection
function testConnection() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path: '/v1/shops.json',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'Quentinvest-POD/2.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

// List existing products
function listProducts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path: `/v1/shops/${SHOP_ID}/products.json`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'Quentinvest-POD/2.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

// Check blueprints
function listBlueprints() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path: '/v1/catalog/blueprints.json',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'Quentinvest-POD/2.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

async function main() {
  console.log('\n🔍 Testing Printify API Connection...\n');
  
  try {
    // Test 1: Connection
    const conn = await testConnection();
    console.log('📡 API Status:', conn.status);
    
    if (conn.status === 200) {
      const shops = JSON.parse(conn.data);
      console.log('✅ Connection successful!');
      console.log('🏪 Shops:', shops.length);
      shops.forEach(s => console.log(`   - ${s.title} (ID: ${s.id})`));
    } else {
      console.log('❌ Connection failed:', conn.data);
      process.exit(1);
    }
    
    // Test 2: List products
    console.log('\n📦 Listing products...');
    const prods = await listProducts();
    if (prods.status === 200) {
      const products = JSON.parse(prods.data);
      console.log('📦 Products:', products.data ? products.data.length : 0);
      if (products.data) {
        products.data.forEach(p => {
          const published = p.visible === true ? '✅ PUBLISHED' : '❌ DRAFT';
          console.log(`   ${published} | ${p.title} | $${p.variants?.[0]?.price || 'N/A'}`);
        });
      }
    }
    
    // Test 3: Catalog
    console.log('\n📋 Checking catalog...');
    const cat = await listBlueprints();
    if (cat.status === 200) {
      const blueprints = JSON.parse(cat.data);
      console.log('📋 Blueprints available:', blueprints.data ? blueprints.data.length : 'N/A');
    }
    
    console.log('\n✅ All systems operational!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
