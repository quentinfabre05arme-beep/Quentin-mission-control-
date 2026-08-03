// Claw Market Data Snapshot — Skill wrapper around the proven multi-source fetcher
const { fetchAllPrices, fetchAssetWithFallback } = require('../../mission_control/market_data_service');

class MarketDataService {
  constructor(options = {}) {
    this.force = options.force || false;
  }

  async getAllPrices() {
    return fetchAllPrices(this.force);
  }

  async getPrice(symbol) {
    return fetchAssetWithFallback(symbol);
  }

  async refresh() {
    return fetchAllPrices(true);
  }
}

module.exports = MarketDataService;
