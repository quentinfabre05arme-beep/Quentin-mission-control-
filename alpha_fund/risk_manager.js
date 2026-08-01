const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const PORTFOLIO_PATH = path.join(__dirname, 'data', 'portfolio.json');
const PERFORMANCE_PATH = path.join(__dirname, 'data', 'performance.json');

function loadPortfolio() {
  return JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
}

function savePortfolio(p) {
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(p, null, 2));
}

function loadPerformance() {
  return JSON.parse(fs.readFileSync(PERFORMANCE_PATH, 'utf8'));
}

function getSectorExposure(portfolio) {
  const map = {};
  for (const pos of portfolio.positions || []) {
    map[pos.sector || 'Unknown'] = (map[pos.sector || 'Unknown'] || 0) + (pos.marketValue || 0);
  }
  return map;
}

function getTotalEquityValue(portfolio) {
  return (portfolio.positions || []).reduce((sum, p) => sum + (p.marketValue || 0), 0);
}

function getNav(portfolio) {
  return portfolio.cash + getTotalEquityValue(portfolio) + (portfolio.options || []).reduce((s, o) => s + (o.marketValue || 0), 0);
}

function canOpenPosition(symbol, notional, portfolio = loadPortfolio(), perf = loadPerformance()) {
  const errors = [];
  if (CONFIG.leverageAllowed) errors.push('Leverage not allowed but config flag true');
  if (!notional || notional < CONFIG.minPositionSize) errors.push(`Position below minimum ${CONFIG.minPositionSize}`);
  const nav = getNav(portfolio);
  if (notional / nav > CONFIG.maxSinglePositionPct) {
    errors.push(`Single position ${((notional / nav) * 100).toFixed(2)}% exceeds max ${(CONFIG.maxSinglePositionPct * 100).toFixed(0)}%`);
  }
  const deployed = getTotalEquityValue(portfolio) / nav;
  if (deployed > CONFIG.maxCashDeployPct) {
    errors.push(`Cash already ${(deployed * 100).toFixed(2)}% deployed`);
  }
  const existing = (portfolio.positions || []).find(p => p.symbol === symbol);
  if (existing && (existing.marketValue + notional) / nav > CONFIG.maxSinglePositionPct) {
    errors.push('Adding would breach single-position limit');
  }
  if ((perf.summary || {}).maxDrawdownPct <= -CONFIG.maxDrawdownStopPct * 100) {
    errors.push('Fund in max drawdown stop — no new positions');
  }
  return { ok: errors.length === 0, errors };
}

function canTradeOption(optionType, underlyingQty = 0, cashRequired = 0, portfolio = loadPortfolio()) {
  const errors = [];
  if (!CONFIG.allowOptions) errors.push('Options disabled in config');
  if (!CONFIG.allowedOptionTypes.includes(optionType)) errors.push(`Option type ${optionType} not allowed`);
  if (CONFIG.leverageAllowed) errors.push('Leverage not allowed');
  if (optionType === 'covered_call' && underlyingQty <= 0) errors.push('Covered call requires underlying long position');
  if (optionType === 'protective_put' && underlyingQty <= 0) errors.push('Protective put requires underlying long position');
  if (optionType === 'cash_secured_put' && cashRequired > portfolio.cash) errors.push('Insufficient cash for cash-secured put');
  return { ok: errors.length === 0, errors };
}

function checkStops(portfolio, prices) {
  const alerts = [];
  for (const pos of portfolio.positions || []) {
    const px = prices[pos.symbol];
    if (!px || !px.price) continue;
    const current = px.price;
    if (pos.hardStop && current <= pos.hardStop) {
      alerts.push({ symbol: pos.symbol, action: 'stop_loss', price: current, reason: `Hard stop hit at ${pos.hardStop}` });
    }
    const trailing = pos.trailingStop || (pos.highPrice ? pos.highPrice * (1 - CONFIG.trailingStopPct) : 0);
    if (pos.highPrice && current <= trailing) {
      alerts.push({ symbol: pos.symbol, action: 'trailing_stop', price: current, reason: `Trailing stop hit at ${trailing.toFixed(2)}` });
    }
    if (current > (pos.highPrice || 0)) {
      pos.highPrice = current;
    }
  }
  return alerts;
}

function computePositionSize(signalStrength, nav, maxPct = CONFIG.maxSinglePositionPct) {
  const target = nav * maxPct * Math.min(1, Math.max(0.2, signalStrength));
  return Math.max(CONFIG.minPositionSize, Math.floor(target));
}

module.exports = {
  loadPortfolio,
  savePortfolio,
  loadPerformance,
  getSectorExposure,
  getTotalEquityValue,
  getNav,
  canOpenPosition,
  canTradeOption,
  checkStops,
  computePositionSize,
  CONFIG
};
