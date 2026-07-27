/**
 * GET PRICE - Simple CLI for single asset price lookup
 * Usage: node get_price.js BTC
 * Usage: node get_price.js ETH --json
 */

const { fetchAssetWithFallback } = require('./market_data_service');

async function main() {
  const args = process.argv.slice(2);
  const symbol = args.find(a => !a.startsWith('--'))?.toUpperCase() || 'BTC';
  const format = args.includes('--json') ? 'json' : 'text';
  
  const validSymbols = ['BTC', 'ETH', 'MSTR', 'HIMS'];
  
  if (!validSymbols.includes(symbol)) {
    console.error(`❌ Invalid symbol: ${symbol}`);
    console.error(`Valid symbols: ${validSymbols.join(', ')}`);
    process.exit(1);
  }
  
  try {
    const data = await fetchAssetWithFallback(symbol);
    
    if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      const changeStr = data.change_24h >= 0 ? '+' : '';
      const stale = data.stale ? ' [STALE]' : '';
      console.log(`\n💰 ${symbol}: $${data.price.toLocaleString()} (${changeStr}${data.change_24h?.toFixed(2) || 0}%)`);
      console.log(`📡 Source: ${data.source}${stale}`);
      console.log(`📅 ${new Date(data.timestamp).toLocaleString()}\n`);
    }
  } catch (e) {
    console.error(`❌ Failed to fetch ${symbol}: ${e.message}`);
    process.exit(1);
  }
}

main();
