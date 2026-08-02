/**
 * ALPHA FUND v3.0 — Unified Intelligence Engine
 * Merges: catalyst_watcher + sec_13f_scraper + risk_manager
 */

const fs = require('fs');
const path = require('path');

// ─── CATALYST DATABASE ──────────────────────────────────────
const CATALYST_DB = [
  { ticker: 'TSLA', date: '2026-07-25', event: 'Q2 Earnings', impact: 'high', type: 'earnings' },
  { ticker: 'NVDA', date: '2026-07-30', event: 'SIGGRAPH Conference', impact: 'medium', type: 'conference' },
  { ticker: 'PLTR', date: '2026-08-05', event: 'Government Contract Award', impact: 'high', type: 'contract' },
  { ticker: 'MSTR', date: '2026-07-28', event: 'BTC Treasury Update', impact: 'medium', type: 'update' },
  { ticker: 'AAPL', date: '2026-07-29', event: 'Q3 Earnings', impact: 'high', type: 'earnings' },
  { ticker: 'COIN', date: '2026-08-01', event: 'Institutional Platform Launch', impact: 'high', type: 'product' },
  { ticker: 'HIMS', date: '2026-08-10', event: 'FDA Panel Review', impact: 'high', type: 'fda' }
];

// ─── CATALYST WATCHER ─────────────────────────────────────
function getUpcomingCatalysts(daysAhead = 14) {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysAhead);
  
  return CATALYST_DB.filter(c => {
    const eventDate = new Date(c.date);
    return eventDate >= today && eventDate <= future;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─── RISK MANAGER ───────────────────────────────────────────
function calculateRisk(portfolio, opportunities) {
  const alerts = [];
  
  // Position concentration risk
  const totalValue = portfolio.cash + portfolio.positions.reduce((sum, p) => {
    return sum + (p.quantity * (p.current_price || p.entry_price));
  }, 0);
  
  portfolio.positions.forEach(pos => {
    const positionValue = pos.quantity * (pos.current_price || pos.entry_price);
    const weight = (positionValue / totalValue) * 100;
    
    if (weight > 20) {
      alerts.push({
        type: 'CRITICAL',
        ticker: pos.ticker,
        message: `${pos.ticker} ${weight.toFixed(1)}% position size — trim to ≤15%`,
        action: 'TRIM'
      });
    } else if (weight > 15) {
      alerts.push({
        type: 'HIGH',
        ticker: pos.ticker,
        message: `${pos.ticker} ${weight.toFixed(1)}% — approaching limit`,
        action: 'WATCH'
      });
    }
    
    // Stop loss check
    if (pos.stop_loss) {
      const currentPrice = pos.current_price || pos.entry_price;
      const distance = ((currentPrice / pos.stop_loss) - 1) * 100;
      if (distance < 5) {
        alerts.push({
          type: 'HIGH',
          ticker: pos.ticker,
          message: `${pos.ticker} ${distance.toFixed(1)}% above stop at $${pos.stop_loss}`,
          action: 'WATCH'
        });
      }
    }
  });
  
  // Sector concentration (simplified)
  const cryptoPositions = portfolio.positions.filter(p => ['BTC', 'ETH', 'MSTR', 'COIN'].includes(p.ticker));
  const cryptoValue = cryptoPositions.reduce((sum, p) => sum + p.quantity * (p.current_price || p.entry_price), 0);
  const cryptoWeight = (cryptoValue / totalValue) * 100;
  
  if (cryptoWeight > 50) {
    alerts.push({
      type: 'MEDIUM',
      ticker: 'CRYPTO',
      message: `Crypto cluster ${cryptoWeight.toFixed(1)}% — concentration risk`,
      action: 'DIVERSIFY'
    });
  }
  
  // Market environment
  if (opportunities && opportunities.sentiment) {
    const fg = opportunities.sentiment.fear_greed;
    if (fg < 20) {
      alerts.push({
        type: 'MEDIUM',
        ticker: 'MARKET',
        message: `Fear & Greed ${fg} — extreme fear, contrarian opportunity`,
        action: 'OPPORTUNITY'
      });
    }
  }
  
  return {
    totalValue,
    position_count: portfolio.positions.length,
    max_position_size: Math.max(...portfolio.positions.map(p => {
      const val = p.quantity * (p.current_price || p.entry_price);
      return (val / totalValue) * 100;
    }), 0),
    crypto_weight: cryptoWeight,
    alerts,
    risk_level: alerts.some(a => a.type === 'CRITICAL') ? 'CRITICAL' : 
                alerts.some(a => a.type === 'HIGH') ? 'HIGH' : 
                alerts.length > 0 ? 'MEDIUM' : 'LOW'
  };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
async function runAll() {
  console.log('🧠 Running unified intelligence...');
  
  const catalysts = getUpcomingCatalysts();
  console.log(`   📅 ${catalysts.length} upcoming catalysts`);
  
  // Load portfolio for risk calc
  const portfolioPath = path.join(__dirname, '..', 'data', 'portfolio.json');
  let portfolio = { cash: 10000, positions: [] };
  if (fs.existsSync(portfolioPath)) {
    portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
  }
  
  // Risk analysis (will be completed after research)
  const risk = {
    status: 'PENDING',
    notes: 'Risk calc requires research data'
  };
  
  return {
    catalysts: catalysts.length,
    upcoming: catalysts,
    risk,
    alerts: [], // Will be populated after research
    timestamp: new Date().toISOString()
  };
}

// Post-research risk calculation
function calculatePostResearch(intelligence, research, portfolio) {
  const risk = calculateRisk(portfolio, research);
  
  // Add catalyst alerts
  const upcomingTickers = portfolio.positions.map(p => p.ticker);
  const relevantCatalysts = intelligence.upcoming.filter(c => upcomingTickers.includes(c.ticker));
  
  relevantCatalysts.forEach(c => {
    risk.alerts.push({
      type: c.impact === 'high' ? 'HIGH' : 'MEDIUM',
      ticker: c.ticker,
      message: `${c.ticker}: ${c.event} on ${c.date}`,
      action: 'MONITOR',
      catalyst: c
    });
  });
  
  return {
    ...intelligence,
    risk,
    alerts: risk.alerts,
    risk_level: risk.risk_level
  };
}

module.exports = { runAll, getUpcomingCatalysts, calculateRisk, calculatePostResearch };
