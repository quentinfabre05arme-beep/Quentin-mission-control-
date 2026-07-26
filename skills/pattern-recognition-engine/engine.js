/**
 * Pattern Recognition Engine
 * Detect patterns in user behavior and data
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(__dirname, '..', '..', 'memory', 'detected_patterns.json');

class PatternRecognition {
  constructor() {
    this.patterns = this.loadPatterns();
  }

  loadPatterns() {
    if (fs.existsSync(PATTERNS_FILE)) {
      return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
    }
    return { timePatterns: [], topicPatterns: [], actionPatterns: [] };
  }

  analyzeText(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const frequency = {};
    
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }

  detectTimePatterns(interactions) {
    const hourDistribution = {};
    
    for (const interaction of interactions) {
      const hour = new Date(interaction.timestamp).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    }
    
    const patterns = Object.entries(hourDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        frequency: count,
        confidence: Math.min(count / 10, 0.95)
      }));
    
    this.patterns.timePatterns = patterns;
    return patterns;
  }

  detectTopicPatterns(texts) {
    const allWords = texts.flatMap(text => this.analyzeText(text));
    const aggregated = {};
    
    for (const { word, count } of allWords) {
      aggregated[word] = (aggregated[word] || 0) + count;
    }
    
    const patterns = Object.entries(aggregated)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        topic: word,
        frequency: count,
        confidence: Math.min(count / 20, 0.95)
      }));
    
    this.patterns.topicPatterns = patterns;
    return patterns;
  }

  savePatterns() {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.patterns, null, 2));
  }

  getInsights() {
    return {
      peakHours: this.patterns.timePatterns.slice(0, 3),
      topTopics: this.patterns.topicPatterns.slice(0, 5),
      totalPatterns: this.patterns.timePatterns.length + this.patterns.topicPatterns.length
    };
  }
}

module.exports = PatternRecognition;
