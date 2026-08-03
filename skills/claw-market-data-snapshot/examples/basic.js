const MarketDataService = require('../market_data_service');

async function main() {
  const service = new MarketDataService();
  const data = await service.getAllPrices();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
