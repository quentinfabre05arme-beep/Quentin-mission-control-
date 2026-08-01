const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const research = require('./research_engine');
const risk = require('./risk_manager');
const momentum = require('./strategies/momentum');
const meanReversion = require('./strategies/mean_reversion');
const value = require('./strategies/value');
const macro = require('./strategies/macro');

const PORTFOLIO_PATH = path.join(__dirname, 'data', 'portfolio.json');
const LEDGER_PATH = path.join(__dirname, 'data', 'paper_ledger.json');
const PERFORMANCE_PATH = path.join(__dirname, 'data', 'performance.json');

function loadJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; } }
function saveJson(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2)); }

function loadPortfolio() { return loadJson(PORTFOLIO_PATH, { cash: CONFIG.initialCapital, positions: [], options: [], pendingOrders: [] }); }
function savePortfolio(p) { saveJson(PORTFOLIO_PATH, p); }
function loadLedger() { return loadJson(LEDGER_PATH, { trades: [], stats: {} }); }
function saveLedger(l) { saveJson(LEDGER_PATH, l); }
function loadPerformance() { return loadJson(PERFORMANCE_PATH, { series: [], summary: {} }); }
function savePerformance(p) { saveJson(PERFORMANCE_PATH, p); }

function now() { return new Date().toISOString(); }

async function generateSignals() {
  const market = await research.scanMarket();
  const macroSignal = await macro.evaluateMacro();
  const results = [];
  for (const asset of market.universe) {
    const signals = [];
    const stratResults = [];
    if (CONFIG.strategyWeights.momentum > 0) {
      const r = await momentum.evaluate(asset);
      if (r) { signals.push(r); stratResults.push({ name: 'momentum', ...r }); }
    }
    if (CONFIG.strategyWeights.mean_reversion > 0) {
      const r = await meanReversion.evaluate(asset);
      if (r) { signals.push(r); stratResults.push({ name: 'mean_reversion', ...r }); }
    }
    if (CONFIG.strategyWeights.value > 0) {
      const r = await value.evaluate(asset);
      if (r) { signals.push(r); stratResults.push({ name: 'value', ...r }); }
    }
    if (CONFIG.strategyWeights.macro > 0) {
      const r = await macro.evaluate(asset);
      if (r) { signals.push(r); stratResults.push({ name: 'macro', ...r }); }
    }
    const longVotes = signals.filter(s => s.signal === 'LONG').length;
    const avoidVotes = signals.filter(s => s.signal === 'AVOID').length;
    const consensus = longVotes >= 2 ? 'LONG' : avoidVotes >= 2 ? 'AVOID' : 'HOLD';
    const strength = signals.reduce((sum, s) => sum + (s.strength || 0), 0) / Math.max(1, signals.length);
    results.push({ asset, consensus, strength, signals, stratResults, macro: macroSignal });
  }
  return results;
}

async function rebalance(signals) {
  const portfolio = loadPortfolio();
  const prices = {};
  for (const s of signals) {
    prices[s.asset.symbol] = s.asset.price;
  }
  const stopAlerts = risk.checkStops(portfolio, prices);
  const ledger = loadLedger();
  for (const alert of stopAlerts) {
    const pos = portfolio.positions.find(p => p.symbol === alert.symbol);
    if (!pos) continue;
    const proceeds = pos.qty * alert.price;
    const pnl = proceeds - (pos.costBasis * pos.qty);
    portfolio.cash += proceeds;
    portfolio.positions = portfolio.positions.filter(p => p.symbol !== alert.symbol);
    ledger.trades.push({
      date: now(), symbol: alert.symbol, action: 'SELL', qty: pos.qty, price: alert.price, reason: alert.reason, pnl, fees: 0
    });
    ledger.stats.totalTrades = (ledger.stats.totalTrades || 0) + 1;
    ledger.stats.totalRealizedPnl = (ledger.stats.totalRealizedPnl || 0) + pnl;
  }
  const longs = signals.filter(s => s.consensus === 'LONG').sort((a, b) => b.strength - a.strength).slice(0, 10);
  const nav = risk.getNav(portfolio);
  for (const sig of longs) {
    const symbol = sig.asset.symbol;
    const price = sig.asset.price;
    if (!price) continue;
    const size = risk.computePositionSize(sig.strength, nav, CONFIG.maxSinglePositionPct);
    const qty = Math.floor(size / price);
    if (qty <= 0) continue;
    const notional = qty * price;
    const check = risk.canOpenPosition(symbol, notional, portfolio);
    if (!check.ok) continue;
    const existing = portfolio.positions.find(p => p.symbol === symbol);
    if (existing) {
      const totalCost = (existing.qty * existing.costBasis) + notional;
      existing.qty += qty;
      existing.costBasis = totalCost / existing.qty;
      existing.marketValue = existing.qty * price;
    } else {
      portfolio.positions.push({
        symbol,
        type: sig.asset.type || 'equity',
        sector: sig.asset.sector || 'Unknown',
        qty,
        costBasis: price,
        marketValue: notional,
        highPrice: price,
        hardStop: price * (1 - CONFIG.hardStopPct),
        entryDate: now()
      });
    }
    portfolio.cash -= notional;
    ledger.trades.push({
      date: now(), symbol, action: 'BUY', qty, price, reason: `${sig.consensus} consensus (strength ${sig.strength.toFixed(2)})`, pnl: 0, fees: 0
    });
    ledger.stats.totalTrades = (ledger.stats.totalTrades || 0) + 1;
  }
  savePortfolio(portfolio);
  saveLedger(ledger);
  return { portfolio, stopAlerts, signals: longs };
}

function updatePerformance() {
  const portfolio = loadPortfolio();
  const perf = loadPerformance();
  const nav = risk.getNav(portfolio);
  const date = now().split('T')[0];
  const existing = perf.series.find(s => s.date === date);
  if (existing) existing.nav = nav; else perf.series.push({ date, nav });
  perf.summary.currentNav = nav;
  perf.summary.highWaterMark = Math.max(perf.summary.highWaterMark || nav, nav);
  perf.summary.totalReturnPct = ((nav - CONFIG.initialCapital) / CONFIG.initialCapital) * 100;
  const dd = ((perf.summary.highWaterMark - nav) / perf.summary.highWaterMark) * 100;
  perf.summary.maxDrawdownPct = Math.max(perf.summary.maxDrawdownPct || 0, dd);
  if (perf.series.length > 1) {
    const returns = [];
    for (let i = 1; i < perf.series.length; i++) {
      returns.push((perf.series[i].nav - perf.series[i - 1].nav) / perf.series[i - 1].nav);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    const vol = Math.sqrt(variance) * Math.sqrt(252);
    perf.summary.volatilityAnnualPct = vol * 100;
    perf.summary.sharpeRatio = vol ? (mean * 252) / vol : 0;
  }
  perf.summary.lastUpdated = now();
  savePerformance(perf);
  return perf.summary;
}

async function runCycle() {
  console.log(`[${now()}] Running ${CONFIG.fundName} cycle...`);
  const signals = await generateSignals();
  const rebalanceResult = await rebalance(signals);
  const summary = updatePerformance();
  console.log(`NAV: $${summary.currentNav.toFixed(2)} | Return: ${summary.totalReturnPct.toFixed(2)}% | Positions: ${rebalanceResult.portfolio.positions.length}`);
  return { signals, rebalanceResult, summary };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--run')) {
    await runCycle();
  } else if (args.includes('--report')) {
    const result = await runCycle();
    const reporter = require('./daily_report');
    await reporter.generateAndSend(result);
  } else {
    console.log('Usage: node fund_manager.js --run | --report');
  }
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runCycle, generateSignals, rebalance, updatePerformance };
