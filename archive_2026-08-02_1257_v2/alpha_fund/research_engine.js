const fs = require('fs');
const path = require('path');
const { getPrices, fetchJson } = require('./utils/market_data');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const UNIVERSE = {
  equity: [
    { symbol: 'SPY', sector: 'Broad Market', name: 'SPDR S&P 500' },
    { symbol: 'QQQ', sector: 'Tech', name: 'Invesco QQQ' },
    { symbol: 'IWM', sector: 'Small Cap', name: 'Russell 2000 ETF' },
    { symbol: 'VTI', sector: 'Broad Market', name: 'Vanguard Total Stock' },
    { symbol: 'AAPL', sector: 'Tech', name: 'Apple' },
    { symbol: 'MSFT', sector: 'Tech', name: 'Microsoft' },
    { symbol: 'NVDA', sector: 'Tech', name: 'NVIDIA' },
    { symbol: 'TSLA', sector: 'Consumer', name: 'Tesla' },
    { symbol: 'JPM', sector: 'Financials', name: 'JPMorgan' },
    { symbol: 'XOM', sector: 'Energy', name: 'ExxonMobil' },
    { symbol: 'GLD', sector: 'Commodity', name: 'Gold ETF' },
    { symbol: 'SLV', sector: 'Commodity', name: 'Silver ETF' },
    { symbol: 'XLF', sector: 'Financials', name: 'Financials ETF' },
    { symbol: 'XLK', sector: 'Tech', name: 'Technology ETF' },
    { symbol: 'XLE', sector: 'Energy', name: 'Energy ETF' }
  ],
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' }
  ],
  forex: [
    { symbol: 'EURUSD=X', name: 'EUR/USD' },
    { symbol: 'GBPUSD=X', name: 'GBP/USD' },
    { symbol: 'USDJPY=X', name: 'USD/JPY' }
  ],
  fixed_income: [
    { symbol: 'TLT', name: '20+ Year Treasuries' },
    { symbol: 'IEF', name: '7-10 Year Treasuries' },
    { symbol: 'HYG', name: 'High Yield Corp' }
  ],
  commodity: [
    { symbol: 'USO', name: 'WTI Crude Oil' },
    { symbol: 'UNG', name: 'Natural Gas' },
    { symbol: 'GLD', name: 'Gold' }
  ]
};

function loadSecrets() {
  const secretsPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.openclaw', 'secrets.json');
  try {
    return JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  } catch (e) { return {}; }
}

async function fetchMacro() {
  const data = {};
  try {
    const fredUrl = 'https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key={key}&sort_order=desc&limit=1&file_type=json';
    const key = loadSecrets().fred_api || process.env.FRED_API;
    if (key) {
      const r = await fetchJson(fredUrl.replace('{key}', key));
      if (r && r.observations && r.observations[0]) data.treasury10y = parseFloat(r.observations[0].value);
    }
  } catch (e) {}
  return data;
}

async function scanMarket() {
  const all = [];
  for (const market of CONFIG.markets) {
    const items = UNIVERSE[market] || [];
    for (const item of items) {
      all.push({ ...item, type: market });
    }
  }
  const unique = [];
  const seen = new Set();
  for (const a of all) {
    if (!seen.has(a.symbol)) {
      seen.add(a.symbol);
      unique.push(a);
    }
  }
  const prices = await getPrices(unique.map(u => ({ symbol: u.symbol, type: u.type })));
  const macro = await fetchMacro();
  const enriched = unique.map(u => {
    const px = prices[u.symbol];
    return {
      ...u,
      price: px ? px.price : null,
      change24hPct: px ? px.change24hPct : null,
      source: px ? px.source : null,
      available: !!px
    };
  }).filter(u => u.available);
  return { macro, universe: enriched };
}

module.exports = { scanMarket, UNIVERSE };
