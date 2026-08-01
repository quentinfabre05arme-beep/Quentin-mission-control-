const fs = require('fs');
const path = require('path');
const { getPrice, fetchJson } = require('../utils/market_data');

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

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

async function evaluate(asset, opts = {}) {
  const hist = opts.history || await getHistory(asset.symbol);
  if (hist.length < 50) return null;
  const current = hist[hist.length - 1];
  const sma20 = sma(hist, 20);
  const sma50 = sma(hist, 50);
  const rsiv = rsi(hist, 14);
  const price20dAgo = hist[hist.length - 20];
  const mom20 = ((current - price20dAgo) / price20dAgo) * 100;
  const score = (current > sma20 ? 1 : 0) + (current > sma50 ? 1 : 0) + (mom20 > 5 ? 1 : 0) + (rsiv > 50 && rsiv < 70 ? 1 : 0);
  let signal = null;
  if (score >= 3) signal = 'LONG';
  else if (score <= 1) signal = 'AVOID';
  return {
    strategy: 'momentum',
    symbol: asset.symbol,
    signal,
    strength: score / 4,
    indicators: { sma20, sma50, rsi14: rsiv, momentum20d: mom20 }
  };
}

module.exports = { evaluate };
