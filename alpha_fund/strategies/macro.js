const fs = require('fs');
const path = require('path');
const { fetchJson } = require('../utils/market_data');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const MACRO_SYMBOLS = {
  DGS10: { symbol: 'TNX', inverse: false },
  DXY: { symbol: 'DX-Y.NYB', inverse: false },
  GOLD: { symbol: 'GLD', inverse: false },
  OIL: { symbol: 'CL=F', inverse: false },
  VIX: { symbol: '^VIX', inverse: false }
};

async function getHistory(symbol) {
  for (const host of ['query2', 'query1']) {
    try {
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
      const data = await fetchJson(url);
      if (data && data.chart && data.chart.result && data.chart.result[0]) {
        const r = data.chart.result[0];
        const closes = (r.indicators?.quote?.[0]?.close || []).filter(c => c !== null);
        if (closes.length > 0) return closes;
      }
    } catch (e) {}
  }
  return [];
}

function sma(arr, n) {
  if (arr.length < n) return null;
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n;
}

async function evaluateMacro() {
  const signals = {};
  let totalScore = 0;
  let count = 0;
  for (const [name, cfg] of Object.entries(MACRO_SYMBOLS)) {
    const hist = await getHistory(cfg.symbol);
    if (hist.length < 50) continue;
    const current = hist[hist.length - 1];
    const s50 = sma(hist, 50);
    const s20 = sma(hist, 20);
    let trend = 0;
    if (current > s50) trend += 1;
    if (current > s20) trend += 1;
    if (s20 > s50) trend += 1;
    const direction = cfg.inverse ? -trend : trend;
    signals[name] = { symbol: cfg.symbol, direction, current, sma20: s20, sma50 };
    totalScore += direction;
    count++;
  }
  const regime = totalScore >= 2 ? 'RISK_ON' : totalScore <= -2 ? 'RISK_OFF' : 'NEUTRAL';
  return {
    strategy: 'macro',
    signal: regime,
    strength: Math.min(1, Math.abs(totalScore) / 4),
    indicators: signals,
    score: totalScore,
    count
  };
}

async function evaluate(asset) {
 const macro = await evaluateMacro();
 let signal = null;
 if (macro.signal === 'RISK_ON') signal = 'LONG';
 else if (macro.signal === 'RISK_OFF') signal = 'AVOID';
 return {
   strategy: 'macro',
   symbol: asset.symbol,
   signal,
   strength: macro.strength,
   indicators: { regime: macro.signal, macroScore: macro.score }
 };
}

module.exports = { evaluate, evaluateMacro };
