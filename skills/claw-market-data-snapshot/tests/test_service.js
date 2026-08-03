const MarketDataService = require('../market_data_service');
const assert = require('assert');

async function runTests() {
  const service = new MarketDataService();

  // Test 1: getAllPrices returns a structured result
  const all = await service.getAllPrices();
  assert(all && typeof all === 'object', 'getAllPrices must return an object');
  assert(all.assets && typeof all.assets === 'object', 'assets object missing');
  assert(all.timestamp, 'timestamp missing');
  console.log('✅ Test 1 passed: getAllPrices structure valid');

  // Test 2: Core symbols present
  const required = ['BTC', 'ETH', 'MSTR', 'HIMS'];
  for (const sym of required) {
    assert(all.assets[sym], `Missing asset: ${sym}`);
    assert(typeof all.assets[sym].price === 'number', `${sym} price missing`);
    console.log(`✅ Test 2.${sym} passed: ${sym} price = $${all.assets[sym].price}`);
  }

  // Test 3: getPrice single symbol
  const btc = await service.getPrice('BTC');
  assert(btc && typeof btc.price === 'number', 'BTC single fetch failed');
  console.log('✅ Test 3 passed: getPrice single symbol works');

  // Test 4: Refresh forces fresh fetch
  const refreshed = await service.refresh();
  assert(refreshed && refreshed.assets, 'refresh failed');
  console.log('✅ Test 4 passed: refresh works');

  console.log('\n🐾 All tests passed');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
