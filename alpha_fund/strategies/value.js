const { fetchJson } = require('../utils/market_data');

async function getHistory(symbol) {
  for (const host of ['query2', 'query1']) {
    try {
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
      const data = await fetchJson(url);
      if (data && data.chart && data.chart.result && data.chart.result[0]) {
        const r = data.chart.result[0];
        const closes = (r.indicators?.quote?.[0]?.close || []).filter(c => c !== null);
        if (closes.length > 0) return { closes, currency: r.meta.currency || 'USD' };
      }
    } catch (e) {}
  }
  return { closes: [], currency: 'USD' };
}

async function evaluate(asset, opts = {}) {
  const histResult = opts.history ? { closes: opts.history, currency: 'USD' } : await getHistory(asset.symbol);
  const hist = histResult;
  if (hist.closes.length < 200) return null;
  const current = hist.closes[hist.closes.length - 1];
  const max = Math.max(...hist.closes);
  const min = Math.min(...hist.closes);
  const drawdownFromAth = ((current - max) / max) * 100;
  const percentile = ((current - min) / (max - min)) * 100;
  const sma200 = hist.closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
  let signal = null;
  let strength = 0;
  if (drawdownFromAth < -30 && percentile < 25 && current > sma200) {
    signal = 'LONG';
    strength = 0.9;
  } else if (drawdownFromAth < -20 && percentile < 30) {
    signal = 'LONG';
    strength = 0.6;
  } else if (percentile > 80) {
    signal = 'AVOID';
    strength = 0.5;
  }
  return {
    strategy: 'value',
    symbol: asset.symbol,
    signal,
    strength,
    indicators: { drawdownFromAth, percentile, sma200 }
  };
}

module.exports = { evaluate };
