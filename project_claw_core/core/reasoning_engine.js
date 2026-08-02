function reason(problem, options) {
  // Simple weighted reasoning
  return options.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
}

module.exports = { reason };