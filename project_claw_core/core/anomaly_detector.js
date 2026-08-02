/**
 * PROJECT CLAW CORE — Anomaly Detector
 * Detect unusual spikes, drops, and patterns in numeric data.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'anomaly_detector.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);
}

class AnomalyDetector {
  detectZScore(data, threshold = 2) {
    log(`Z-score anomaly detection, threshold=${threshold}`);
    const values = data.map(d => d.value);
    const m = mean(values);
    const sd = stdDev(values);
    const anomalies = [];
    
    for (const point of data) {
      const z = sd === 0 ? 0 : (point.value - m) / sd;
      if (Math.abs(z) > threshold) {
        anomalies.push({
          ...point,
          z_score: z,
          mean: m,
          std_dev: sd,
          direction: z > 0 ? 'spike' : 'drop'
        });
      }
    }
    return anomalies;
  }
  
  detectThreshold(data, { min, max }) {
    return data.filter(d => {
      if (min !== undefined && d.value < min) return true;
      if (max !== undefined && d.value > max) return true;
      return false;
    }).map(d => ({
      ...d,
      breach: d.value < (min ?? -Infinity) ? 'below_min' : 'above_max',
      threshold: d.value < (min ?? -Infinity) ? min : max
    }));
  }
  
  detectChangeRate(data, thresholdPercent = 10) {
    log(`Change rate detection, threshold=${thresholdPercent}%`);
    const anomalies = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1].value;
      const curr = data[i].value;
      if (prev === 0) continue;
      const change = ((curr - prev) / Math.abs(prev)) * 100;
      if (Math.abs(change) > thresholdPercent) {
        anomalies.push({
          ...data[i],
          previous_value: prev,
          change_percent: change,
          direction: change > 0 ? 'spike' : 'drop'
        });
      }
    }
    return anomalies;
  }
}

module.exports = { AnomalyDetector, mean, stdDev };

if (require.main === module) {
  const detector = new AnomalyDetector();
  const data = [
    { timestamp: 't1', value: 100 },
    { timestamp: 't2', value: 102 },
    { timestamp: 't3', value: 101 },
    { timestamp: 't4', value: 250 },
    { timestamp: 't5', value: 99 }
  ];
  console.log('Z-score:', detector.detectZScore(data, 1.5));
  console.log('Change rate:', detector.detectChangeRate(data, 10));
}
