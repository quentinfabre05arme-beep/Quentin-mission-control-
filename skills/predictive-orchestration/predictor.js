/**
 * Predictive Orchestrator
 * Pre-load data based on learned patterns
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(__dirname, '..', '..', 'memory', 'predictive_patterns.json');
const PRELOAD_LOG = path.join(__dirname, '..', '..', 'logs', 'preload_actions.jsonl');

class PredictiveOrchestrator {
  constructor() {
    this.patterns = this.loadPatterns();
    this.preloads = [];
  }

  loadPatterns() {
    if (fs.existsSync(PATTERNS_FILE)) {
      return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
    }
    return {
      timePatterns: [],
      topicPatterns: [],
      actionChains: [],
      lastUpdated: new Date().toISOString()
    };
  }

  savePatterns() {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.patterns, null, 2));
  }

  /**
   * Learn patterns from interaction history
   */
  learnFromHistory(interactions) {
    this.extractTimePatterns(interactions);
    this.extractTopicPatterns(interactions);
    this.extractActionChains(interactions);
    this.savePatterns();
  }

  extractTimePatterns(interactions) {
    const hourDistribution = {};
    const dayDistribution = {};
    
    for (const interaction of interactions) {
      const date = new Date(interaction.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      const key = `${day}-${hour}`;
      
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
      dayDistribution[day] = (dayDistribution[day] || 0) + 1;
    }
    
    // Find peak times
    const peakHours = Object.entries(hourDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        frequency: count,
        confidence: count / interactions.length
      }));
    
    this.patterns.timePatterns = peakHours;
  }

  extractTopicPatterns(interactions) {
    const topicCounts = {};
    
    for (const interaction of interactions) {
      const topics = this.extractTopics(interaction.message);
      for (const topic of topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }
    
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({
        topic,
        frequency: count,
        confidence: count / interactions.length
      }));
    
    this.patterns.topicPatterns = topTopics;
  }

  extractTopics(message) {
    if (!message) return [];
    
    const cryptoTerms = ['BTC', 'ETH', 'bitcoin', 'ethereum', 'crypto'];
    const stockTerms = ['MSTR', 'HIMS', 'AAPL', 'COIN', 'stock', 'market'];
    const researchTerms = ['research', 'analyze', 'study', 'investigate'];
    
    const topics = [];
    const lowerMsg = message.toLowerCase();
    
    for (const term of [...cryptoTerms, ...stockTerms, ...researchTerms]) {
      if (lowerMsg.includes(term.toLowerCase())) {
        topics.push(term.toUpperCase());
      }
    }
    
    return [...new Set(topics)];
  }

  extractActionChains(interactions) {
    // Find sequences: After X, user usually does Y
    const chains = [];
    
    for (let i = 0; i < interactions.length - 1; i++) {
      const current = interactions[i];
      const next = interactions[i + 1];
      
      const timeDiff = new Date(next.timestamp) - new Date(current.timestamp);
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff < 60) { // Within 1 hour
        chains.push({
          from: current.type,
          to: next.type,
          timeGap: minutesDiff
        });
      }
    }
    
    this.patterns.actionChains = chains;
  }

  /**
   * Get predictions for current time
   */
  getPredictionsForNow() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    const predictions = [];
    
    // Check time-based predictions
    for (const pattern of this.patterns.timePatterns) {
      if (Math.abs(pattern.hour - currentHour) <= 1) {
        predictions.push({
          type: 'time_based',
          confidence: pattern.confidence,
          action: `Pre-load data for ${pattern.hour}:00 activity`,
          priority: pattern.confidence > 0.5 ? 'high' : 'medium'
        });
      }
    }
    
    // Check topic-based predictions
    for (const pattern of this.patterns.topicPatterns.slice(0, 3)) {
      predictions.push({
        type: 'topic_based',
        confidence: pattern.confidence,
        action: `Monitor ${pattern.topic} trends`,
        priority: 'medium'
      });
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Execute predicted preloads
   */
  executePredictions(predictions) {
    const executed = [];
    
    for (const prediction of predictions) {
      if (prediction.confidence > 0.3) {
        const result = this.executePreload(prediction);
        executed.push(result);
        
        // Log preload action
        this.logPreload(prediction, result);
      }
    }
    
    return executed;
  }

  executePreload(prediction) {
    const startTime = Date.now();
    
    // Simulate preload actions
    switch (prediction.type) {
      case 'time_based':
        return {
          action: 'pre_load_data',
          status: 'completed',
          duration: Date.now() - startTime,
          prediction
        };
      
      case 'topic_based':
        return {
          action: 'monitor_topic',
          status: 'completed',
          duration: Date.now() - startTime,
          prediction
        };
      
      default:
        return {
          action: 'unknown',
          status: 'skipped',
          prediction
        };
    }
  }

  logPreload(prediction, result) {
    const entry = {
      timestamp: new Date().toISOString(),
      prediction,
      result,
      latency: result.duration
    };
    
    fs.appendFileSync(PRELOAD_LOG, JSON.stringify(entry) + '\n');
  }

  /**
   * Get preload status for user
   */
  getPreloadStatus() {
    const predictions = this.getPredictionsForNow();
    const recentPreloads = this.getRecentPreloads();
    
    return {
      predictions: predictions.length,
      recentPreloads: recentPreloads.length,
      topPredictions: predictions.slice(0, 5),
      ready: predictions.filter(p => p.confidence > 0.5).length
    };
  }

  getRecentPreloads() {
    if (!fs.existsSync(PRELOAD_LOG)) return [];
    
    const lines = fs.readFileSync(PRELOAD_LOG, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean);
    
    return lines
      .slice(-20)
      .map(line => JSON.parse(line));
  }
}

module.exports = PredictiveOrchestrator;
