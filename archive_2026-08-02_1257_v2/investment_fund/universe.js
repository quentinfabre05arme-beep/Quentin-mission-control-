// Alpha Fund - Full Trading Universe

const UNIVERSE = {
  // Tier 1: Crypto (High volatility, short-term)
  crypto: {
    majors: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'LINK', 'MATIC'],
    mid: ['UNI', 'AAVE', 'CRV', 'MKR', 'COMP', 'SNX', 'YFI'],
    momentum: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK']
  },
  
  // Tier 2: Growth/Momentum Equities
  equities: {
    tech: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'META', 'NFLX', 'AMD'],
    growth: ['MSTR', 'HIMS', 'PLTR', 'COIN', 'SQ', 'SHOP', 'SNOW', 'CRWD'],
    crypto_stocks: ['MARA', 'RIOT', 'CLSK', 'CORZ', 'BTBT', 'WULF'],
    biotech: ['LLY', 'NVO', 'HIMS', 'PFE', 'MRNA', 'BNTX'],
    ai: ['NVDA', 'PLTR', 'AI', 'SMCI', 'ARM', 'AVGO']
  },
  
  // Tier 3: Macro/Multi-Asset
  macro: {
    gold: ['GLD', 'IAU'],
    silver: ['SLV'],
    oil: ['USO', 'UCO'],
    bonds: ['TLT', 'TMF'],
    volatility: ['VIXY', 'UVXY', 'SVIX']
  },
  
  // ETFs for sector rotation
  etfs: {
    sectors: ['XLF', 'XLK', 'XLE', 'XLI', 'XLU', 'XLP', 'XLB', 'XRT'],
    leverage: ['SPXL', 'SPXS', 'TQQQ', 'SQQQ', 'SOXL', 'SOXS'],
    crypto: ['BITO', 'ARKW', 'ARKK']
  }
};

// Flatten for scanning
function getAllSymbols() {
  return [
    ...UNIVERSE.crypto.majors,
    ...UNIVERSE.crypto.mid.slice(0, 5),
    ...UNIVERSE.equities.tech.slice(0, 8),
    ...UNIVERSE.equities.growth.slice(0, 6),
    ...UNIVERSE.equities.crypto_stocks.slice(0, 4),
    ...UNIVERSE.macro.gold,
    ...UNIVERSE.etfs.leverage.slice(0, 4)
  ];
}

// Priority scan list (40 symbols)
const PRIORITY_SCAN = [
  // Crypto Majors
  'BTC', 'ETH', 'SOL', 'XRP', 'LINK', 'ADA',
  // Tech/Growth
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'AMD', 'PLTR', 'SNOW',
  // Crypto Stocks
  'MSTR', 'MARA', 'RIOT', 'COIN', 'CLSK',
  // Biotech/Health
  'LLY', 'HIMS', 'NVO',
  // Commodities/Vol
  'GLD', 'SLV', 'USO', 'VIXY',
  // Leverage
  'TQQQ', 'SQQQ', 'SOXL', 'SPXL'
];

module.exports = { UNIVERSE, getAllSymbols, PRIORITY_SCAN };