function detectAnomaly(value, history) {
  if (history.length < 5) return false;
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  const std = Math.sqrt(history.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / history.length);
  return Math.abs(value - avg) > 2 * std;
}

module.exports = { detectAnomaly };