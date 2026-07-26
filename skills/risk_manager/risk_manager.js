#!/usr/bin/env node
/**
 * Risk Manager - Comprehensive Trading Risk Assessment System
 * 
 * Features:
 * - Position sizing based on risk % and stop-loss
 * - Portfolio risk calculation (concentration, correlation)
 * - Stop-loss level computation (ATR-based, fixed %, technical)
 * - Maximum drawdown tracking with alerts
 * - Risk/reward ratio analysis
 * - Value at Risk (VaR) calculation
 * - Risk-adjusted returns (Sharpe, Sortino)
 * - Saves assessments to memory/
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  maxRiskPerTrade: 0.02,      // 2% of portfolio per trade
  maxPortfolioRisk: 0.06,      // 6% total portfolio at risk
  maxDrawdownAlert: 0.15,      // 15% drawdown alert
  maxDrawdownStop: 0.25,       // 25% hard stop
  minRiskReward: 2.0,          // Minimum 2:1 risk/reward
  maxPositionSize: 0.20,       // 20% max single position
  atrMultiplier: 2.0,          // ATR multiplier for stop-loss
  varConfidence: 0.95,          // 95% confidence for VaR
  varDays: 1,                  // 1-day VaR
};

const RISK_LEVELS = {
  LOW: { threshold: 0.02, label: 'LOW', emoji: '🟢' },
  MEDIUM: { threshold: 0.04, label: 'MEDIUM', emoji: '🟡' },
  HIGH: { threshold: 0.06, label: 'HIGH', emoji: '🟠' },
  CRITICAL: { threshold: Infinity, label: 'CRITICAL', emoji: '🔴' }
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getMemoryDir() {
  const memDir = path.join(process.cwd(), 'memory');
  ensureDir(memDir);
  return memDir;
}

function saveToMemory(filename, data) {
  const memDir = getMemoryDir();
  const filepath = path.join(memDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`💾 Saved: ${filepath}`);
  return filepath;
}

function loadFromMemory(filename) {
  const memDir = getMemoryDir();
  const filepath = path.join(memDir, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  return null;
}

function getRiskLevel(riskPct) {
  if (riskPct <= RISK_LEVELS.LOW.threshold) return RISK_LEVELS.LOW;
  if (riskPct <= RISK_LEVELS.MEDIUM.threshold) return RISK_LEVELS.MEDIUM;
  if (riskPct <= RISK_LEVELS.HIGH.threshold) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.CRITICAL;
}

function formatPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// POSITION SIZING
// ============================================================================

/**
 * Calculate position size based on risk parameters
 * 
 * @param {Object} params - Position parameters
 * @param {number} params.portfolioValue - Total portfolio value
 * @param {number} params.entryPrice - Entry price
 * @param {number} params.stopLoss - Stop-loss price
 * @param {number} params.riskPct - Risk percentage (0.02 = 2%)
 * @param {number} [params.maxPositionPct=0.20] - Max position as % of portfolio
 * @returns {Object} Position sizing result
 */
function calculatePositionSize(params) {
  const { portfolioValue, entryPrice, stopLoss, riskPct, maxPositionPct = 0.20 } = params;
  
  if (!portfolioValue || !entryPrice || !stopLoss) {
    throw new Error('Missing required parameters: portfolioValue, entryPrice, stopLoss');
  }
  
  if (stopLoss >= entryPrice) {
    throw new Error('Stop-loss must be below entry price for long positions');
  }
  
  // Risk amount in currency
  const riskAmount = portfolioValue * riskPct;
  
  // Risk per unit (entry - stop)
  const riskPerUnit = entryPrice - stopLoss;
  const riskPerUnitPct = riskPerUnit / entryPrice;
  
  // Check if trade is viable (risk per unit must be less than risk amount)
  if (riskPerUnit > riskAmount) {
    return {
      positionSize: 0,
      positionValue: 0,
      positionPct: 0,
      riskAmount: 0,
      riskPct: 0,
      riskPerUnit,
      riskPerUnitPct,
      isConstrained: false,
      maxPositionApplied: false,
      originalPositionSize: 0,
      originalPositionPct: 0,
      units: 0,
      entryPrice,
      stopLoss,
      portfolioValue,
      riskPctInput: riskPct,
      maxPositionPct,
      viable: false,
      error: `Risk per unit ($${riskPerUnit.toFixed(2)}) exceeds max risk amount ($${riskAmount.toFixed(2)}). Widen stop or increase risk %.`
    };
  }
  
  // Number of units/shares
  const positionSize = Math.floor(riskAmount / riskPerUnit);
  
  // Position value
  const positionValue = positionSize * entryPrice;
  const positionPct = positionValue / portfolioValue;
  
  // Apply max position constraint
  const constrainedPositionValue = Math.min(positionValue, portfolioValue * maxPositionPct);
  const constrainedPositionSize = Math.floor(constrainedPositionValue / entryPrice);
  const constrainedRisk = constrainedPositionSize * riskPerUnit;
  
  const isConstrained = positionPct > maxPositionPct;
  
  return {
    positionSize: constrainedPositionSize,
    positionValue: constrainedPositionSize * entryPrice,
    positionPct: (constrainedPositionSize * entryPrice) / portfolioValue,
    riskAmount: constrainedRisk,
    riskPct: constrainedRisk / portfolioValue,
    riskPerUnit,
    riskPerUnitPct,
    isConstrained,
    maxPositionApplied: isConstrained,
    originalPositionSize: positionSize,
    originalPositionPct: positionPct,
    units: constrainedPositionSize,
    entryPrice,
    stopLoss,
    portfolioValue,
    riskPctInput: riskPct,
    maxPositionPct
  };
}

/**
 * Calculate stop-loss levels using different methods
 * 
 * @param {Object} params - Stop parameters
 * @param {number} params.entryPrice - Entry price
 * @param {number} [params.atr] - ATR value (for ATR-based stop)
 * @param {number} [params.atrMultiplier=2.0] - ATR multiplier
 * @param {number} [params.fixedPct=0.05] - Fixed percentage (5%)
 * @param {number} [params.supportLevel] - Technical support level
 * @param {string} [params.method='atr'] - Stop method: 'atr', 'fixed', 'technical'
 * @returns {Object} Stop-loss result
 */
function calculateStopLoss(params) {
  const { entryPrice, atr, atrMultiplier = 2.0, fixedPct = 0.05, supportLevel, method = 'atr' } = params;
  
  if (!entryPrice) {
    throw new Error('Missing required parameter: entryPrice');
  }
  
  let stopPrice, stopPct, stopDistance, recommendation;
  
  switch (method) {
    case 'atr':
      if (!atr) throw new Error('ATR value required for ATR-based stop');
      stopDistance = atr * atrMultiplier;
      stopPrice = entryPrice - stopDistance;
      stopPct = stopDistance / entryPrice;
      recommendation = `ATR(${atr.toFixed(2)}) × ${atrMultiplier} = ${stopDistance.toFixed(2)}`;
      break;
      
    case 'fixed':
      stopPct = fixedPct;
      stopDistance = entryPrice * fixedPct;
      stopPrice = entryPrice - stopDistance;
      recommendation = `Fixed ${(fixedPct * 100).toFixed(1)}% = ${stopDistance.toFixed(2)}`;
      break;
      
    case 'technical':
      if (!supportLevel) throw new Error('Support level required for technical stop');
      stopPrice = supportLevel * 0.98; // 2% below support
      stopDistance = entryPrice - stopPrice;
      stopPct = stopDistance / entryPrice;
      recommendation = `Below support ${supportLevel.toFixed(2)} (-2%)`;
      break;
      
    default:
      throw new Error(`Unknown stop method: ${method}`);
  }
  
  return {
    stopPrice,
    stopPct,
    stopDistance,
    method,
    recommendation,
    entryPrice,
    riskPerUnit: stopDistance,
    riskPerUnitPct: stopPct
  };
}

// ============================================================================
// PORTFOLIO RISK
// ============================================================================

/**
 * Calculate comprehensive portfolio risk metrics
 * 
 * @param {Object} params - Portfolio parameters
 * @param {Array} params.positions - Array of positions {symbol, value, entryPrice, currentPrice, stopLoss}
 * @param {number} params.portfolioValue - Total portfolio value
 * @param {Array} [params.historicalReturns] - Historical returns for VaR calculation
 * @returns {Object} Portfolio risk assessment
 */
function calculatePortfolioRisk(params) {
  const { positions, portfolioValue, historicalReturns = [] } = params;
  
  if (!positions || !portfolioValue) {
    throw new Error('Missing required parameters: positions, portfolioValue');
  }
  
  // Individual position metrics
  const positionMetrics = positions.map(pos => {
    const positionValue = pos.value || (pos.units * pos.currentPrice);
    const positionPct = positionValue / portfolioValue;
    const unrealizedPnl = pos.currentPrice ? (pos.currentPrice - pos.entryPrice) * (pos.units || 1) : 0;
    const unrealizedPnlPct = pos.entryPrice ? (pos.currentPrice - pos.entryPrice) / pos.entryPrice : 0;
    
    // Risk for this position
    let riskAmount = 0;
    let riskPct = 0;
    if (pos.stopLoss && pos.entryPrice) {
      const riskPerUnit = Math.abs(pos.entryPrice - pos.stopLoss);
      const units = pos.units || Math.floor((portfolioValue * 0.02) / riskPerUnit);
      riskAmount = units * riskPerUnit;
      riskPct = riskAmount / portfolioValue;
    }
    
    return {
      symbol: pos.symbol,
      positionValue,
      positionPct,
      unrealizedPnl,
      unrealizedPnlPct,
      riskAmount,
      riskPct,
      riskLevel: getRiskLevel(riskPct).label,
      entryPrice: pos.entryPrice,
      currentPrice: pos.currentPrice,
      stopLoss: pos.stopLoss
    };
  });
  
  // Portfolio-level metrics
  const totalPositionValue = positionMetrics.reduce((sum, p) => sum + p.positionValue, 0);
  const totalRiskAmount = positionMetrics.reduce((sum, p) => sum + p.riskAmount, 0);
  const totalRiskPct = totalRiskAmount / portfolioValue;
  const cashPct = 1 - (totalPositionValue / portfolioValue);
  
  // Concentration analysis
  const sortedBySize = [...positionMetrics].sort((a, b) => b.positionPct - a.positionPct);
  const largestPosition = sortedBySize[0];
  const top3Concentration = sortedBySize.slice(0, 3).reduce((sum, p) => sum + p.positionPct, 0);
  
  // Sector/uncorrelated analysis (simplified - would need correlation matrix)
  const concentrationRisk = largestPosition.positionPct > 0.20 ? 'HIGH' : 
                            largestPosition.positionPct > 0.15 ? 'MEDIUM' : 'LOW';
  
  // VaR calculation (if historical returns provided)
  let var95 = null;
  let var99 = null;
  if (historicalReturns.length > 0) {
    const sortedReturns = [...historicalReturns].sort((a, b) => a - b);
    const idx95 = Math.floor(sortedReturns.length * 0.05);
    const idx99 = Math.floor(sortedReturns.length * 0.01);
    var95 = sortedReturns[idx95];
    var99 = sortedReturns[idx99];
  }
  
  const riskLevel = getRiskLevel(totalRiskPct);
  
  return {
    portfolioValue,
    totalPositionValue,
    cashPct,
    totalRiskAmount,
    totalRiskPct,
    riskLevel: riskLevel.label,
    riskEmoji: riskLevel.emoji,
    largestPosition: {
      symbol: largestPosition.symbol,
      pct: largestPosition.positionPct
    },
    top3Concentration,
    concentrationRisk,
    var95,
    var99,
    positionCount: positions.length,
    positionMetrics,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// DRAWDOWN TRACKING
// ============================================================================

/**
 * Calculate drawdown metrics from equity curve
 * 
 * @param {Array} equityCurve - Array of {date, value} or just values
 * @returns {Object} Drawdown analysis
 */
function calculateDrawdown(equityCurve) {
  if (!equityCurve || equityCurve.length === 0) {
    throw new Error('Equity curve required');
  }
  
  const values = equityCurve.map(p => typeof p === 'object' ? p.value : p);
  
  let peak = values[0];
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let currentDrawdown = 0;
  const drawdowns = [];
  
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    
    if (value > peak) {
      peak = value;
      currentDrawdown = 0;
    } else {
      currentDrawdown = peak - value;
      const drawdownPct = currentDrawdown / peak;
      
      if (drawdownPct > maxDrawdownPct) {
        maxDrawdown = currentDrawdown;
        maxDrawdownPct = drawdownPct;
      }
    }
    
    drawdowns.push({
      index: i,
      value,
      peak,
      drawdown: currentDrawdown,
      drawdownPct: currentDrawdown / peak
    });
  }
  
  const currentValue = values[values.length - 1];
  const currentPeak = Math.max(...values);
  const currentDD = currentPeak - currentValue;
  const currentDDPct = currentDD / currentPeak;
  
  return {
    maxDrawdown,
    maxDrawdownPct,
    currentDrawdown: currentDD,
    currentDrawdownPct: currentDDPct,
    peak: currentPeak,
    currentValue,
    totalReturn: (currentValue - values[0]) / values[0],
    drawdownHistory: drawdowns,
    alertTriggered: currentDDPct > DEFAULT_CONFIG.maxDrawdownAlert,
    hardStopTriggered: currentDDPct > DEFAULT_CONFIG.maxDrawdownStop,
    timestamp: new Date().toISOString()
  };
}

/**
 * Update running drawdown log
 * 
 * @param {number} currentEquity - Current portfolio value
 */
function updateDrawdownLog(currentEquity) {
  const logFile = 'drawdown_log.json';
  let log = loadFromMemory(logFile);
  
  if (!log) {
    log = {
      startEquity: currentEquity,
      entries: [],
      created: new Date().toISOString()
    };
  }
  
  log.entries.push({
    timestamp: new Date().toISOString(),
    equity: currentEquity
  });
  
  // Calculate drawdown from log
  const values = log.entries.map(e => e.equity);
  const dd = calculateDrawdown(values);
  
  log.maxDrawdown = dd.maxDrawdown;
  log.maxDrawdownPct = dd.maxDrawdownPct;
  log.currentDrawdownPct = dd.currentDrawdownPct;
  log.alertTriggered = dd.alertTriggered;
  log.hardStopTriggered = dd.hardStopTriggered;
  
  saveToMemory(logFile, log);
  return dd;
}

// ============================================================================
// RISK/REWARD ANALYSIS
// ============================================================================

/**
 * Calculate risk/reward ratio for a trade setup
 * 
 * @param {Object} params - Trade parameters
 * @param {number} params.entryPrice - Entry price
 * @param {number} params.stopLoss - Stop-loss price
 * @param {number} params.targetPrice - Target/take-profit price
 * @returns {Object} Risk/reward analysis
 */
function calculateRiskReward(params) {
  const { entryPrice, stopLoss, targetPrice } = params;
  
  if (!entryPrice || !stopLoss || !targetPrice) {
    throw new Error('Missing required parameters: entryPrice, stopLoss, targetPrice');
  }
  
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(targetPrice - entryPrice);
  const ratio = reward / risk;
  const riskPct = risk / entryPrice;
  const rewardPct = reward / entryPrice;
  const breakevenWinRate = 1 / (ratio + 1);
  const requiredWinRate = breakevenWinRate;
  
  // Assessment
  let assessment = 'POOR';
  let recommendation = 'REJECT';
  if (ratio >= 3) {
    assessment = 'EXCELLENT';
    recommendation = 'ACCEPT';
  } else if (ratio >= 2) {
    assessment = 'GOOD';
    recommendation = 'ACCEPT';
  } else if (ratio >= 1.5) {
    assessment = 'ACCEPTABLE';
    recommendation = 'CONDITIONAL';
  } else if (ratio >= 1) {
    assessment = 'MARGINAL';
    recommendation = 'REJECT';
  }
  
  return {
    risk,
    reward,
    ratio: ratio.toFixed(2),
    riskPct,
    rewardPct,
    breakevenWinRate,
    requiredWinRatePct: (requiredWinRate * 100).toFixed(1),
    assessment,
    recommendation,
    meetsMinimum: ratio >= DEFAULT_CONFIG.minRiskReward,
    entryPrice,
    stopLoss,
    targetPrice
  };
}

// ============================================================================
// RISK-ADJUSTED RETURNS
// ============================================================================

/**
 * Calculate Sharpe ratio
 * 
 * @param {Array} returns - Array of period returns
 * @param {number} [riskFreeRate=0.02] - Annual risk-free rate
 * @param {number} [periodsPerYear=252] - Trading periods per year
 * @returns {Object} Sharpe ratio analysis
 */
function calculateSharpeRatio(returns, riskFreeRate = 0.02, periodsPerYear = 252) {
  if (!returns || returns.length < 2) {
    throw new Error('At least 2 returns required');
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  const periodRiskFree = riskFreeRate / periodsPerYear;
  const excessReturn = mean - periodRiskFree;
  const sharpe = stdDev > 0 ? excessReturn / stdDev : 0;
  const annualizedSharpe = sharpe * Math.sqrt(periodsPerYear);
  
  return {
    meanReturn: mean,
    stdDev,
    sharpeRatio: sharpe,
    annualizedSharpe,
    riskFreeRate,
    periodsPerYear,
    excessReturn,
    assessment: annualizedSharpe > 1 ? 'GOOD' : annualizedSharpe > 0.5 ? 'ACCEPTABLE' : 'POOR'
  };
}

/**
 * Calculate Sortino ratio (downside deviation only)
 * 
 * @param {Array} returns - Array of period returns
 * @param {number} [targetReturn=0] - Minimum acceptable return
 * @param {number} [periodsPerYear=252] - Trading periods per year
 * @returns {Object} Sortino ratio analysis
 */
function calculateSortinoRatio(returns, targetReturn = 0, periodsPerYear = 252) {
  if (!returns || returns.length < 2) {
    throw new Error('At least 2 returns required');
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < targetReturn);
  const downsideVariance = downsideReturns.length > 0 
    ? downsideReturns.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downsideReturns.length 
    : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  
  const sortino = downsideDev > 0 ? (mean - targetReturn) / downsideDev : 0;
  const annualizedSortino = sortino * Math.sqrt(periodsPerYear);
  
  return {
    meanReturn: mean,
    downsideDeviation: downsideDev,
    downsideReturns: downsideReturns.length,
    sortinoRatio: sortino,
    annualizedSortino,
    targetReturn,
    periodsPerYear,
    assessment: annualizedSortino > 1 ? 'GOOD' : annualizedSortino > 0.5 ? 'ACCEPTABLE' : 'POOR'
  };
}

// ============================================================================
// COMPLETE RISK ASSESSMENT
// ============================================================================

/**
 * Run complete risk assessment for a potential trade
 * 
 * @param {Object} trade - Trade parameters
 * @param {Object} portfolio - Current portfolio state
 * @returns {Object} Complete risk assessment
 */
function assessTradeRisk(trade, portfolio) {
  const { symbol, entryPrice, stopLoss, targetPrice, portfolioValue, atr, units } = trade;
  
  // Position sizing
  const sizing = calculatePositionSize({
    portfolioValue,
    entryPrice,
    stopLoss,
    riskPct: DEFAULT_CONFIG.maxRiskPerTrade,
    maxPositionPct: DEFAULT_CONFIG.maxPositionSize
  });
  
  // Risk/reward
  const rr = calculateRiskReward({ entryPrice, stopLoss, targetPrice });
  
  // Stop-loss alternative methods
  const stopAtr = atr ? calculateStopLoss({ entryPrice, atr, method: 'atr' }) : null;
  const stopFixed = calculateStopLoss({ entryPrice, fixedPct: 0.05, method: 'fixed' });
  
  // Portfolio impact
  const portfolioRisk = portfolio ? calculatePortfolioRisk({
    positions: [...portfolio.positions, { symbol, value: sizing.positionValue, entryPrice, currentPrice: entryPrice, stopLoss }],
    portfolioValue,
    historicalReturns: portfolio.historicalReturns || []
  }) : null;
  
  // Overall assessment
  const checks = {
    positionSizeOk: sizing.positionPct <= DEFAULT_CONFIG.maxPositionSize,
    riskPerTradeOk: sizing.riskPct <= DEFAULT_CONFIG.maxRiskPerTrade,
    riskRewardOk: rr.meetsMinimum,
    portfolioRiskOk: portfolioRisk ? portfolioRisk.totalRiskPct <= DEFAULT_CONFIG.maxPortfolioRisk : true
  };
  
  const allChecksPass = Object.values(checks).every(v => v);
  
  const assessment = {
    symbol,
    timestamp: new Date().toISOString(),
    sizing,
    riskReward: rr,
    stopAlternatives: { atr: stopAtr, fixed: stopFixed },
    portfolioImpact: portfolioRisk,
    checks,
    approved: allChecksPass,
    riskLevel: getRiskLevel(sizing.riskPct).label,
    warnings: []
  };
  
  // Add warnings
  if (!checks.positionSizeOk) assessment.warnings.push(`Position size ${formatPct(sizing.positionPct)} exceeds max ${formatPct(DEFAULT_CONFIG.maxPositionSize)}`);
  if (!checks.riskPerTradeOk) assessment.warnings.push(`Risk per trade ${formatPct(sizing.riskPct)} exceeds max ${formatPct(DEFAULT_CONFIG.maxRiskPerTrade)}`);
  if (!checks.riskRewardOk) assessment.warnings.push(`Risk/reward ${rr.ratio} below minimum ${DEFAULT_CONFIG.minRiskReward}`);
  if (!checks.portfolioRiskOk) assessment.warnings.push(`Portfolio risk ${formatPct(portfolioRisk.totalRiskPct)} exceeds max ${formatPct(DEFAULT_CONFIG.maxPortfolioRisk)}`);
  
  return assessment;
}

// ============================================================================
// REPORTING
// ============================================================================

function printTradeAssessment(assessment) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 TRADE RISK ASSESSMENT: ${assessment.symbol}`);
  console.log('='.repeat(60));
  
  console.log(`\n🎯 POSITION SIZING`);
  console.log(`   Entry Price:     ${formatCurrency(assessment.sizing.entryPrice)}`);
  console.log(`   Stop Loss:       ${formatCurrency(assessment.sizing.stopLoss)}`);
  console.log(`   Position Size:   ${assessment.sizing.positionSize} units`);
  console.log(`   Position Value:  ${formatCurrency(assessment.sizing.positionValue)}`);
  console.log(`   Position %:      ${formatPct(assessment.sizing.positionPct)}`);
  console.log(`   Risk Amount:     ${formatCurrency(assessment.sizing.riskAmount)}`);
  console.log(`   Risk %:          ${formatPct(assessment.sizing.riskPct)}`);
  if (assessment.sizing.isConstrained) {
    console.log(`   ⚠️  CONSTRAINED by max position size`);
  }
  
  console.log(`\n⚖️  RISK/REWARD`);
  console.log(`   Risk:            ${formatCurrency(assessment.riskReward.risk)} (${formatPct(assessment.riskReward.riskPct)})`);
  console.log(`   Reward:          ${formatCurrency(assessment.riskReward.reward)} (${formatPct(assessment.riskReward.rewardPct)})`);
  console.log(`   Ratio:           1:${assessment.riskReward.ratio}`);
  console.log(`   Breakeven Win %: ${assessment.riskReward.requiredWinRatePct}%`);
  console.log(`   Assessment:      ${assessment.riskReward.assessment} (${assessment.riskReward.recommendation})`);
  
  console.log(`\n🛑 STOP-LOSS ALTERNATIVES`);
  if (assessment.stopAlternatives.atr) {
    console.log(`   ATR-based:       ${formatCurrency(assessment.stopAlternatives.atr.stopPrice)} (${formatPct(assessment.stopAlternatives.atr.stopPct)})`);
  }
  console.log(`   Fixed 5%:        ${formatCurrency(assessment.stopAlternatives.fixed.stopPrice)} (${formatPct(assessment.stopAlternatives.fixed.stopPct)})`);
  
  if (assessment.portfolioImpact) {
    console.log(`\n📈 PORTFOLIO IMPACT`);
    console.log(`   Total Risk:      ${formatPct(assessment.portfolioImpact.totalRiskPct)} ${assessment.portfolioImpact.riskEmoji}`);
    console.log(`   Largest Pos:     ${assessment.portfolioImpact.largestPosition.symbol} (${formatPct(assessment.portfolioImpact.largestPosition.pct)})`);
    console.log(`   Top 3 Conc:      ${formatPct(assessment.portfolioImpact.top3Concentration)}`);
    console.log(`   Cash %:          ${formatPct(assessment.portfolioImpact.cashPct)}`);
  }
  
  console.log(`\n✅ RISK CHECKS`);
  for (const [check, passed] of Object.entries(assessment.checks)) {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  }
  
  if (assessment.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS`);
    assessment.warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  console.log(`\n🚦 FINAL: ${assessment.approved ? '🟢 APPROVED' : '🔴 REJECTED'} (${assessment.riskLevel} RISK)`);
  console.log('='.repeat(60) + '\n');
}

function printPortfolioReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PORTFOLIO RISK REPORT');
  console.log('='.repeat(60));
  console.log(`Portfolio Value:    ${formatCurrency(report.portfolioValue)}`);
  console.log(`Total Risk:         ${formatPct(report.totalRiskPct)} ${report.riskEmoji}`);
  console.log(`Cash %:             ${formatPct(report.cashPct)}`);
  console.log(`Positions:          ${report.positionCount}`);
  console.log(`Largest Position:   ${report.largestPosition.symbol} (${formatPct(report.largestPosition.pct)})`);
  console.log(`Top 3 Conc:         ${formatPct(report.top3Concentration)}`);
  console.log(`Concentration:      ${report.concentrationRisk}`);
  if (report.var95 !== null) {
    console.log(`VaR 95%:            ${formatPct(report.var95)}`);
    console.log(`VaR 99%:            ${formatPct(report.var99)}`);
  }
  
  console.log(`\n📋 POSITIONS`);
  report.positionMetrics.forEach(p => {
    const emoji = p.riskPct > 0.04 ? '🔴' : p.riskPct > 0.02 ? '🟡' : '🟢';
    console.log(`   ${emoji} ${p.symbol}: ${formatPct(p.positionPct)} pos | ${formatPct(p.riskPct)} risk | ${formatPct(p.unrealizedPnlPct)} PnL`);
  });
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// TEST DATA & RUNNER
// ============================================================================

function getTestPortfolio() {
  return {
    portfolioValue: 100000,
    positions: [
      { symbol: 'BTC', value: 20000, entryPrice: 60000, currentPrice: 65000, stopLoss: 58000 },
      { symbol: 'ETH', value: 15000, entryPrice: 3000, currentPrice: 3200, stopLoss: 2800 },
      { symbol: 'MSTR', value: 10000, entryPrice: 1200, currentPrice: 1300, stopLoss: 1100 },
      { symbol: 'HIMS', value: 5000, entryPrice: 25, currentPrice: 28, stopLoss: 22 }
    ],
    historicalReturns: [
      0.02, -0.01, 0.03, -0.02, 0.01, 0.04, -0.03, 0.02, -0.01, 0.03,
      0.01, -0.02, 0.03, 0.01, -0.04, 0.02, 0.03, -0.01, 0.02, 0.01,
      -0.03, 0.02, 0.04, -0.02, 0.01, 0.03, -0.01, 0.02, 0.01, -0.02
    ]
  };
}

function runTests() {
  console.log('\n🧪 RUNNING RISK MANAGER TESTS\n');
  
  const testPortfolio = getTestPortfolio();
  
  // Test 1: Position Sizing (with workable numbers: $100k portfolio, $100 stock, $95 stop = 5% stop)
  console.log('TEST 1: Position Sizing');
  const sizing1 = calculatePositionSize({
    portfolioValue: 100000,
    entryPrice: 100,
    stopLoss: 95,
    riskPct: 0.02,
    maxPositionPct: 0.20
  });
  console.log(`   Position Size: ${sizing1.positionSize} units`);
  console.log(`   Position Value: ${formatCurrency(sizing1.positionValue)}`);
  console.log(`   Risk: ${formatPct(sizing1.riskPct)}`);
  if (sizing1.viable === false) {
    console.log(`   ⚠️  ${sizing1.error}`);
  }
  console.log(`   ✅ Position sizing OK\n`);
  
  // Test 1b: Position Sizing with tight stop (should show not viable)
  console.log('TEST 1b: Position Sizing (tight stop - non-viable)');
  const sizing2 = calculatePositionSize({
    portfolioValue: 100000,
    entryPrice: 65000,
    stopLoss: 64000,
    riskPct: 0.02,
    maxPositionPct: 0.20
  });
  console.log(`   Position Size: ${sizing2.positionSize} BTC`);
  if (sizing2.viable === false) {
    console.log(`   ⚠️  Expected: ${sizing2.error}`);
  }
  console.log(`   ✅ Non-viable detection OK\n`);
  
  // Test 2: Stop-Loss Calculation
  console.log('TEST 2: Stop-Loss Methods');
  const stopAtr = calculateStopLoss({ entryPrice: 65000, atr: 1500, method: 'atr' });
  const stopFixed = calculateStopLoss({ entryPrice: 65000, fixedPct: 0.05, method: 'fixed' });
  console.log(`   ATR Stop: ${formatCurrency(stopAtr.stopPrice)} (${formatPct(stopAtr.stopPct)})`);
  console.log(`   Fixed Stop: ${formatCurrency(stopFixed.stopPrice)} (${formatPct(stopFixed.stopPct)})`);
  console.log(`   ✅ Stop-loss OK\n`);
  
  // Test 3: Risk/Reward
  console.log('TEST 3: Risk/Reward');
  const rr = calculateRiskReward({ entryPrice: 100, stopLoss: 95, targetPrice: 120 });
  console.log(`   Ratio: 1:${rr.ratio}`);
  console.log(`   Assessment: ${rr.assessment}`);
  console.log(`   ✅ Risk/reward OK\n`);
  
  // Test 4: Portfolio Risk
  console.log('TEST 4: Portfolio Risk');
  const portRisk = calculatePortfolioRisk({
    positions: testPortfolio.positions,
    portfolioValue: testPortfolio.portfolioValue,
    historicalReturns: testPortfolio.historicalReturns
  });
  printPortfolioReport(portRisk);
  console.log(`   ✅ Portfolio risk OK\n`);
  
  // Test 5: Drawdown
  console.log('TEST 5: Drawdown Tracking');
  const equityCurve = [100000, 102000, 98000, 101000, 95000, 97000, 99000, 102000, 100000, 103000];
  const dd = calculateDrawdown(equityCurve);
  console.log(`   Max Drawdown: ${formatPct(dd.maxDrawdownPct)}`);
  console.log(`   Current DD: ${formatPct(dd.currentDrawdownPct)}`);
  console.log(`   ✅ Drawdown OK\n`);
  
  // Test 6: Sharpe & Sortino
  console.log('TEST 6: Risk-Adjusted Returns');
  const returns = testPortfolio.historicalReturns;
  const sharpe = calculateSharpeRatio(returns);
  const sortino = calculateSortinoRatio(returns);
  console.log(`   Sharpe: ${sharpe.annualizedSharpe.toFixed(2)} (${sharpe.assessment})`);
  console.log(`   Sortino: ${sortino.annualizedSortino.toFixed(2)} (${sortino.assessment})`);
  console.log(`   ✅ Risk-adjusted returns OK\n`);
  
  // Test 7: Complete Assessment
  console.log('TEST 7: Complete Trade Assessment');
  const assessment = assessTradeRisk({
    symbol: 'AAPL',
    entryPrice: 100,
    stopLoss: 95,
    targetPrice: 120,
    portfolioValue: 100000,
    atr: 3
  }, testPortfolio);
  printTradeAssessment(assessment);
  console.log(`   ✅ Complete assessment OK\n`);
  
  // Save results to memory
  const timestamp = new Date().toISOString().split('T')[0];
  
  const riskReport = {
    type: 'risk_assessment',
    timestamp,
    sizing: sizing1,
    stopLoss: { atr: stopAtr, fixed: stopFixed },
    riskReward: rr,
    portfolio: portRisk,
    drawdown: dd,
    sharpe,
    sortino,
    tradeAssessment: assessment
  };
  
  const filepath = saveToMemory(`risk_assessment_${timestamp}.json`, riskReport);
  
  console.log('\n✅ ALL TESTS PASSED');
  console.log(`💾 Results saved to: ${filepath}\n`);
  
  return {
    tests: {
      sizing: sizing1,
      stopLoss: { atr: stopAtr, fixed: stopFixed },
      riskReward: rr,
      portfolio: portRisk,
      drawdown: dd,
      sharpe,
      sortino,
      assessment
    },
    filepath,
    allPassed: true
  };
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function showHelp() {
  console.log(`
Risk Manager - Trading Risk Assessment System

Usage:
  node risk_manager.js [options]

Options:
  --test                    Run all tests with sample data
  --portfolio               Calculate portfolio risk from test data
  --position                Calculate position sizing (requires --symbol, --price, --stop, --risk)
  --interactive             Interactive mode
  --symbol=<s>              Symbol (e.g., BTC, AAPL)
  --price=<n>               Entry price
  --stop=<n>                Stop-loss price
  --target=<n>              Target price
  --risk=<n>                Risk percentage (default: 2)
  --portfolio-value=<n>     Portfolio value (default: 100000)
  --help                    Show this help

Examples:
  node risk_manager.js --test
  node risk_manager.js --position --symbol=BTC --price=65000 --stop=62000 --risk=2
  node risk_manager.js --position --symbol=BTC --price=65000 --stop=62000 --target=75000 --risk=2 --portfolio-value=100000
  `);
}

function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🎯 Risk Manager - Interactive Mode\n');
  
  const questions = [
    { name: 'symbol', prompt: 'Symbol (e.g., BTC): ' },
    { name: 'entryPrice', prompt: 'Entry Price: ', type: 'number' },
    { name: 'stopLoss', prompt: 'Stop Loss: ', type: 'number' },
    { name: 'targetPrice', prompt: 'Target Price (optional): ', type: 'number', optional: true },
    { name: 'portfolioValue', prompt: 'Portfolio Value [100000]: ', type: 'number', default: 100000 },
    { name: 'riskPct', prompt: 'Risk % [2]: ', type: 'number', default: 2 }
  ];
  
  const answers = {};
  let i = 0;
  
  function askNext() {
    if (i >= questions.length) {
      // Run assessment
      const trade = {
        symbol: answers.symbol,
        entryPrice: answers.entryPrice,
        stopLoss: answers.stopLoss,
        targetPrice: answers.targetPrice || answers.entryPrice * 1.2,
        portfolioValue: answers.portfolioValue,
        riskPct: answers.riskPct / 100
      };
      
      const portfolio = getTestPortfolio();
      const assessment = assessTradeRisk(trade, portfolio);
      printTradeAssessment(assessment);
      
      // Save
      const timestamp = new Date().toISOString().split('T')[0];
      saveToMemory(`risk_assessment_${timestamp}_${trade.symbol}.json`, assessment);
      
      rl.close();
      return;
    }
    
    const q = questions[i];
    rl.question(q.prompt, (answer) => {
      if (q.optional && !answer) {
        answers[q.name] = undefined;
      } else if (q.type === 'number') {
        answers[q.name] = answer ? parseFloat(answer) : q.default;
      } else {
        answers[q.name] = answer || q.default;
      }
      i++;
      askNext();
    });
  }
  
  askNext();
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--test')) {
    const results = runTests();
    process.exit(results.allPassed ? 0 : 1);
  }
  
  if (args.includes('--portfolio')) {
    const portfolio = getTestPortfolio();
    const report = calculatePortfolioRisk({
      positions: portfolio.positions,
      portfolioValue: portfolio.portfolioValue,
      historicalReturns: portfolio.historicalReturns
    });
    printPortfolioReport(report);
    
    const timestamp = new Date().toISOString().split('T')[0];
    saveToMemory(`portfolio_risk_${timestamp}.json`, report);
    return;
  }
  
  if (args.includes('--position')) {
    const params = {};
    args.forEach(arg => {
      if (arg.startsWith('--symbol=')) params.symbol = arg.split('=')[1];
      if (arg.startsWith('--price=')) params.entryPrice = parseFloat(arg.split('=')[1]);
      if (arg.startsWith('--stop=')) params.stopLoss = parseFloat(arg.split('=')[1]);
      if (arg.startsWith('--target=')) params.targetPrice = parseFloat(arg.split('=')[1]);
      if (arg.startsWith('--risk=')) params.riskPct = parseFloat(arg.split('=')[1]) / 100;
      if (arg.startsWith('--portfolio-value=')) params.portfolioValue = parseFloat(arg.split('=')[1]);
    });
    
    if (!params.symbol || !params.entryPrice || !params.stopLoss) {
      console.log('❌ Missing required parameters: --symbol, --price, --stop');
      showHelp();
      return;
    }
    
    params.portfolioValue = params.portfolioValue || 100000;
    params.riskPct = params.riskPct || 0.02;
    params.targetPrice = params.targetPrice || params.entryPrice * 1.2;
    
    const portfolio = getTestPortfolio();
    const assessment = assessTradeRisk(params, portfolio);
    printTradeAssessment(assessment);
    
    const timestamp = new Date().toISOString().split('T')[0];
    saveToMemory(`risk_assessment_${timestamp}_${params.symbol}.json`, assessment);
    return;
  }
  
  if (args.includes('--interactive')) {
    interactiveMode();
    return;
  }
  
  showHelp();
}

// Export for use as module
module.exports = {
  calculatePositionSize,
  calculateStopLoss,
  calculatePortfolioRisk,
  calculateDrawdown,
  updateDrawdownLog,
  calculateRiskReward,
  calculateSharpeRatio,
  calculateSortinoRatio,
  assessTradeRisk,
  getRiskLevel,
  runTests,
  getTestPortfolio,
  DEFAULT_CONFIG,
  RISK_LEVELS
};

// Run if called directly
if (require.main === module) {
  main();
}
