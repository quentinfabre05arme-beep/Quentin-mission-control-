const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const tokenMatch = envContent.match(/PRINTIFY_API_KEY=(.+)/);
const TOKEN = tokenMatch ? tokenMatch[1].trim() : '';
const SHOP_ID = 28241288;

function apiCall(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.printify.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', e => reject(e));
    req.end();
  });
}

async function main() {
  const result = await apiCall(`/v1/shops/${SHOP_ID}/products.json`);
  
  if (result.status === 200) {
    const data = JSON.parse(result.data);
    const seen = new Set();
    const products = [];
    
    data.data.forEach(p => {
      const key = p.title + '|' + (p.variants?.[0]?.price || 'N/A');
      if (!seen.has(key)) {
        seen.add(key);
        products.push({
          title: p.title,
          price: p.variants?.[0]?.price || 'N/A',
          visible: p.visible,
          external: p.external?.length || 0,
          id: p.id
        });
      }
    });
    
    console.log(`Unique products: ${products.length}\n`);
    products.forEach(p => {
      const pub = p.visible === true ? 'PUBLISHED' : 'DRAFT';
      const etsy = p.external > 0 ? 'ETSY_LINKED' : 'NO_ETSY';
      console.log(`- ${pub} | ${etsy} | ${p.title} | $${p.price}`);
    });
  }
}

main().catch(e => console.error('Error:', e.message));
