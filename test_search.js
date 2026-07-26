const https = require('https');

// Load key from secret resolver
const { getSecret } = require('./lib/secret_resolver');
const API_KEY = getSecret('serper-api');

const options = {
  hostname: 'google.serper.dev',
  path: '/search',
  method: 'POST',
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Results:', result.organic?.length || 0);
      if (result.organic?.length > 0) {
        console.log('First:', result.organic[0].title);
      } else {
        console.log('Error:', result.error || result.message || 'No results');
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(JSON.stringify({ q: 'BTC price today', num: 5 }));
req.end();
