const { fetchJson } = require('../utils/market_data');

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
  const slice = arr.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

function stddev(arr, n) {
  if (arr.length < n) return null;
  const m = sma(arr, n);
  const slice = arr.slice(-n);
  const variance = slice.reduce((s, v) => s + Math.pow(v - m, 2), 0) / n;
  return Math.sqrt(variance);
}

async function evaluate(asset, opts = {}) {
  const hist = opts.history || await getHistory(asset.symbol);
  if (hist.length < 20) return null;
  const current = hist[hist.length - 1];
  const m = sma(hist, 20);
  const sd = stddev(hist, 20);
  const z = sd ? (current - m) / sd : 0;
  const rsi = (() => {
    if (hist.length < 15) return null;
    let gains = 0, losses = 0;
    for (let i = hist.length - 14; i < hist.length; i++) {
      const d = hist[i] - hist[i - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    return 100 - (100 / (1 + gains / (losses || 1)));
  })();
  let signal = null;
  let strength = 0;
  if (z < -2 && rsi < 30) {
    signal = 'LONG';
    strength = 0.8;
  } else if (z > 2 && rsi > 70) {
    signal = 'AVOID';
    strength = 0.7;
  } else if (z < -1) {
    signal = 'LONG';
    strength = 0.5;
  } else if (z > 1) {
    signal = 'AVOID';
    strength = 0.4;
  }
  return {
    strategy: 'mean_reversion',
    symbol: asset.symbol,
    signal,
    strength,
    indicators: { sma20: m, stddev20: sd, zScore: z, rsi14: rsi }
  };
}

module.exports = { evaluate };
