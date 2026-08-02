/**
 * ALPHA FUND v3.0 — Unified Dashboard Updater
 * Generates HTML dashboard from fund data
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname);

function generateDashboard(data) {
  const { research, intelligence, execution } = data;
  const portfolio = execution ? execution.portfolio : { cash: 10000, positions: [], performance: {} };
  
  const totalValue = portfolio.cash + portfolio.positions.reduce((sum, p) => {
    return sum + p.quantity * (p.current_price || p.entry_price);
  }, 0);
  const totalReturn = ((totalValue / portfolio.initial_capital) - 1) * 100;
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Alpha Fund v3.0 Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0e27; color: #fff; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 5px; }
    .subtitle { color: #6b7280; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card { background: #1a1f3a; border-radius: 12px; padding: 20px; }
    .card h2 { font-size: 18px; margin-bottom: 15px; color: #60a5fa; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2d3748; }
    .metric:last-child { border-bottom: none; }
    .positive { color: #34d399; }
    .negative { color: #f87171; }
    .neutral { color: #9ca3af; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-buy { background: #064e3b; color: #34d399; }
    .badge-sell { background: #450a0a; color: #f87171; }
    .badge-hold { background: #1e3a5f; color: #60a5fa; }
    .alert { padding: 10px; border-radius: 8px; margin-bottom: 10px; }
    .alert-critical { background: #450a0a; border-left: 4px solid #f87171; }
    .alert-high { background: #451a03; border-left: 4px solid #fbbf24; }
    .alert-medium { background: #1e3a5f; border-left: 4px solid #60a5fa; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px; border-top: 1px solid #2d3748; }
    .timestamp { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Alpha Fund v3.0</h1>
    <p class="subtitle">Unified Investment Dashboard — ${new Date().toLocaleString()}</p>
    
    <div class="grid">
      <div class="card">
        <h2>💰 Portfolio Overview</h2>
        <div class="metric">
          <span>Total Value</span>
          <span class="${totalReturn >= 0 ? 'positive' : 'negative'}">$${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%)</span>
        </div>
        <div class="metric">
          <span>Cash</span>
          <span>$${portfolio.cash.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div class="metric">
          <span>Positions</span>
          <span>${portfolio.positions.length}/10</span>
        </div>
        <div class="metric">
          <span>Win Rate</span>
          <span>${(portfolio.performance.win_rate || 0).toFixed(1)}%</span>
        </div>
        <div class="metric">
          <span>Max Drawdown</span>
          <span class="negative">${(portfolio.performance.max_drawdown || 0).toFixed(1)}%</span>
        </div>
      </div>
      
      <div class="card">
        <h2>📈 Market Sentiment</h2>
        <div class="metric">
          <span>Fear & Greed</span>
          <span class="${research && research.sentiment.fear_greed < 30 ? 'negative' : research && research.sentiment.fear_greed > 70 ? 'positive' : 'neutral'}">${research ? research.sentiment.fear_greed : 'N/A'} (${research ? research.sentiment.fear_greed_classification : 'N/A'})</span>
        </div>
        <div class="metric">
          <span>Contrarian Signal</span>
          <span class="${research && research.sentiment.contrarian_signal === 'BULLISH' ? 'positive' : research && research.sentiment.contrarian_signal === 'BEARISH' ? 'negative' : 'neutral'}">${research ? research.sentiment.contrarian_signal : 'N/A'}</span>
        </div>
        <div class="metric">
          <span>Mempool</span>
          <span class="neutral">MEDIUM (84K txs)</span>
        </div>
      </div>
      
      <div class="card">
        <h2>🎯 Signal Summary</h2>
        <div class="metric">
          <span>BUY Signals</span>
          <span class="positive">${research ? research.signals.buy : 0}</span>
        </div>
        <div class="metric">
          <span>HOLD</span>
          <span class="neutral">${research ? research.signals.hold : 0}</span>
        </div>
        <div class="metric">
          <span>SELL Signals</span>
          <span class="negative">${research ? research.signals.sell : 0}</span>
        </div>
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 20px;">
      <h2>📋 Positions & Signals</h2>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price</th>
            <th>24h Change</th>
            <th>Rating</th>
            <th>Score</th>
            <th>Position</th>
            <th>P&L</th>
          </tr>
        </thead>
        <tbody>`;
  
  // Add rows for tracked assets
  const trackedAssets = ['BTC', 'ETH', 'MSTR', 'HIMS', 'NVDA', 'TSLA', 'AAPL', 'COIN'];
  trackedAssets.forEach(asset => {
    const signal = research && research.composite ? research.composite[asset] : null;
    const position = portfolio.positions.find(p => p.ticker === asset);
    
    if (signal || position) {
      const price = signal ? signal.price : (position ? position.current_price : 0);
      const change = signal ? signal.change_24h : 0;
      const rating = signal ? signal.rating : 'N/A';
      const score = signal ? signal.score.toFixed(2) : 'N/A';
      
      let positionStr = '—';
      let pnlStr = '—';
      let pnlClass = 'neutral';
      
      if (position) {
        positionStr = `${position.quantity} @ $${position.entry_price.toFixed(2)}`;
        const pnl = ((price / position.entry_price) - 1) * 100;
        pnlStr = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%`;
        pnlClass = pnl >= 0 ? 'positive' : 'negative';
      }
      
      const badgeClass = rating.includes('BUY') ? 'badge-buy' : rating.includes('SELL') ? 'badge-sell' : 'badge-hold';
      
      html += `
          <tr>
            <td><strong>${asset}</strong></td>
            <td>$${price ? price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}</td>
            <td class="${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</td>
            <td><span class="badge ${badgeClass}">${rating}</span></td>
            <td>${score}</td>
            <td>${positionStr}</td>
            <td class="${pnlClass}">${pnlStr}</td>
          </tr>`;
    }
  });
  
  html += `
        </tbody>
      </table>
    </div>`;
  
  // Add alerts section
  if (intelligence && intelligence.alerts && intelligence.alerts.length > 0) {
    html += `
    <div class="card" style="margin-bottom: 20px;">
      <h2>🚨 Risk Alerts</h2>`;
    
    intelligence.alerts.forEach(alert => {
      const alertClass = alert.type === 'CRITICAL' ? 'alert-critical' : alert.type === 'HIGH' ? 'alert-high' : 'alert-medium';
      html += `
      <div class="alert ${alertClass}">
        <strong>${alert.type}: ${alert.ticker}</strong> — ${alert.message}
        <span style="float: right; font-size: 12px;">${alert.action}</span>
      </div>`;
    });
    
    html += `
    </div>`;
  }
  
  // Add catalysts
  if (intelligence && intelligence.upcoming && intelligence.upcoming.length > 0) {
    html += `
    <div class="card" style="margin-bottom: 20px;">
      <h2>📅 Upcoming Catalysts (14 days)</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Ticker</th>
            <th>Event</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>`;
    
    intelligence.upcoming.slice(0, 5).forEach(c => {
      html += `
          <tr>
            <td>${c.date}</td>
            <td><strong>${c.ticker}</strong></td>
            <td>${c.event}</td>
            <td><span class="badge ${c.impact === 'high' ? 'badge-sell' : 'badge-hold'}">${c.impact.toUpperCase()}</span></td>
          </tr>`;
    });
    
    html += `
        </tbody>
      </table>
    </div>`;
  }
  
  html += `
    <p class="timestamp">Generated: ${new Date().toISOString()} | Alpha Fund v3.0</p>
  </div>
</body>
</html>`;
  
  return html;
}

function update(data) {
  const html = generateDashboard(data);
  fs.writeFileSync(path.join(DASHBOARD_DIR, 'index.html'), html);
  console.log('   📊 Dashboard written to alpha_fund_v3/dashboard/index.html');
}

module.exports = { update, generateDashboard };
