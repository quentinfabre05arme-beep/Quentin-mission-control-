/**
 * 🔮 PREDICTIVE MAINTENANCE ENGINE
 * Analyzes trends to predict problems before they happen
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const PREDICTION_LOG = path.join(LOG_DIR, 'predictions.jsonl');

// ─── RAM TREND ANALYSIS ─────────────────────────────────────
function analyzeRAMTrend() {
  const logFile = path.join(LOG_DIR, 'autonomy.log');
  if (!fs.existsSync(logFile)) return null;
  
  const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(l => l.includes('RAM'));
  const rams = lines.slice(-30).map(l => {
    const match = l.match(/pct\":(\d+)/);
    return match ? parseInt(match[1]) : null;
  }).filter(v => v !== null);
  
  if (rams.length < 5) return null;
  
  const avg = rams.reduce((a,b) => a+b, 0) / rams.length;
  const first = rams[0];
  const last = rams[rams.length - 1];
  const trend = last - first;
  const slope = trend / rams.length; // per-sample slope
  
  // Predict when we'll hit critical (93%)
  let prediction = null;
  if (slope > 0) {
    const samplesToCritical = Math.ceil((93 - last) / slope);
    if (samplesToCritical > 0 && samplesToCritical < 50) {
      prediction = {
        target: 93,
        samples_until: samplesToCritical,
        confidence: Math.min(100, Math.round((slope * 10)))
      };
    }
  }
  
  return {
    samples: rams.length,
    average: Math.round(avg * 10) / 10,
    current: last,
    trend: trend > 0 ? '+' + trend : trend,
    slope: Math.round(slope * 100) / 100,
    prediction,
    status: last > 93 ? 'CRITICAL' : last > 90 ? 'WARNING' : 'OK'
  };
}

// ─── FILE BLOAT ANALYSIS ────────────────────────────────────
function analyzeFileBloat() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let oldFiles = 0;
  let totalFiles = 0;
  
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      try {
        const stat = fs.statSync(fp);
        if (stat.isDirectory() && !f.startsWith('.') && f !== 'node_modules') {
          scan(fp);
        } else if (!stat.isDirectory()) {
          totalFiles++;
          if (now - stat.mtime.getTime() > 30 * dayMs) {
            oldFiles++;
          }
        }
      } catch(e) {}
    });
  }
  
  scan(process.cwd());
  
  return {
    total_files: totalFiles,
    old_files: oldFiles,
    bloat_pct: Math.round((oldFiles / totalFiles) * 100),
    prediction: oldFiles > 1000 ? 'HIGH_BLOAT_SOON' : oldFiles > 500 ? 'MEDIUM_BLOAT' : 'OK'
  };
}

// ─── GENERATE PREDICTIONS ───────────────────────────────────
function generatePredictions() {
  const ram = analyzeRAMTrend();
  const files = analyzeFileBloat();
  
  const predictions = [];
  
  if (ram && ram.prediction) {
    predictions.push({
      type: 'RAM_CRITICAL',
      severity: 'HIGH',
      prediction: `RAM will hit ${ram.prediction.target}% in ~${ram.prediction.samples_until} checks`,
      confidence: ram.prediction.confidence + '%',
      action: 'aggressive_cleanup',
      timeframe: 'short_term'
    });
  }
  
  if (files.bloat_pct > 20) {
    predictions.push({
      type: 'FILE_BLOAT',
      severity: 'MEDIUM',
      prediction: `${files.old_files} old files (${files.bloat_pct}%) — workspace slowing`,
      confidence: '85%',
      action: 'run_file_hygiene',
      timeframe: 'medium_term'
    });
  }
  
  if (ram && ram.current > 90 && ram.slope > 0.5) {
    predictions.push({
      type: 'RAM_SPIKE',
      severity: 'CRITICAL',
      prediction: `RAM rising ${ram.slope}% per check — imminent crash risk`,
      confidence: '90%',
      action: 'emergency_protocol',
      timeframe: 'immediate'
    });
  }
  
  return {
    timestamp: new Date().toISOString(),
    ram_analysis: ram,
    file_analysis: files,
    predictions,
    action_required: predictions.filter(p => p.severity === 'CRITICAL' || p.severity === 'HIGH').length > 0
  };
}

// ─── LOG PREDICTIONS ────────────────────────────────────────
function logPredictions(result) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(PREDICTION_LOG, JSON.stringify(result) + '\n');
  
  if (result.action_required) {
    console.log('🔮 PREDICTIONS:');
    result.predictions.forEach(p => {
      const icon = p.severity === 'CRITICAL' ? '🔴' : p.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${icon} ${p.type}: ${p.prediction} (${p.confidence} confidence)`);
    });
  } else {
    console.log('🔮 No critical predictions. System stable.');
  }
}

// ─── MAIN ─────────────────────────────────────────────────
function run() {
  const result = generatePredictions();
  logPredictions(result);
  return result;
}

module.exports = { run, analyzeRAMTrend, analyzeFileBloat, generatePredictions };

if (require.main === module) {
  run();
}
