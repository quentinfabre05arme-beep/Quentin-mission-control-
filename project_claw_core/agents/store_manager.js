const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'store_manager.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}
`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class StoreManager {
  constructor() {}
  async listProducts() { log('Listing products'); return []; }
  async updatePrice(id, price) { log('Updating price ' + id); return { success: true }; }
}

module.exports = { StoreManager };