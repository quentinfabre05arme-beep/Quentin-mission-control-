/**
 * Self-Improving Agent
 * Auto-optimize based on feedback and performance
 */

const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '..', '..', 'memory', 'agent_feedback.json');
const PATTERNS_FILE = path.join(__dirname, '..', '..', 'memory', 'learned_patterns.json');

class SelfImprovingAgent {
  constructor() {
    this.feedback = this.loadFeedback();
    this.patterns = this.loadPatterns();
    this.adjustments = [];
  }

  loadFeedback() {
    if (fs.existsSync(FEEDBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    }
    return { interactions: [], scores: {} };
  }

  loadPatterns() {
    if (fs.existsSync(PATTERNS_FILE)) {
      return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
    }
    return { behaviors: [], triggers: [] };
  }

  saveFeedback() {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(this.feedback, null, 2));
  }

  savePatterns() {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.patterns, null, 2));
  }

  /**
   * Record user feedback
   */
  recordFeedback({ type, message, satisfaction = 0.5 }) {
    const entry = {
      timestamp: new Date().toISOString(),
      type, // 'positive', 'negative', 'neutral'
      message,
      satisfaction,
      context: this.getContext()
    };

    this.feedback.interactions.push(entry);
    this.updateScores(entry);
    this.saveFeedback();

    // Trigger optimization if needed
    this.checkOptimizationNeeded();
  }

  getContext() {
    return {
      hour: new Date().getHours(),
      day: new Date().getDay(),
      recentTopics: this.getRecentTopics()
    };
  }

  getRecentTopics() {
    const recent = this.feedback.interactions.slice(-10);
    // Extract topics from messages
    return [...new Set(recent.map(i => i.message).filter(Boolean))];
  }

  updateScores(entry) {
    const context = `${entry.context.hour}:00`;
    
    if (!this.feedback.scores[context]) {
      this.feedback.scores[context] = { count: 0, total: 0 };
    }
    
    this.feedback.scores[context].count++;
    this.feedback.scores[context].total += entry.satisfaction;
  }

  /**
   * Check if optimization is needed
   */
  checkOptimizationNeeded() {
    const recent = this.feedback.interactions.slice(-20);
    const avgSatisfaction = recent.reduce((a, b) => a + b.satisfaction, 0) / recent.length;
    
    if (avgSatisfaction < 0.6) {
      this.optimize('low_satisfaction');
    }
    
    // Check for patterns
    this.detectPatterns();
  }

  /**
   * Detect usage patterns
   */
  detectPatterns() {
    const interactions = this.feedback.interactions;
    
    // Time-based patterns
    const hourDistribution = {};
    for (const i of interactions) {
      const hour = new Date(i.timestamp).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    }
    
    // Find peak hours
    const peakHours = Object.entries(hourDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    // Save patterns
    this.patterns.behaviors = peakHours.map(hour => ({
      type: 'time_preference',
      value: `${hour}:00`,
      confidence: hourDistribution[hour] / interactions.length
    }));
    
    this.savePatterns();
  }

  /**
   * Optimize based on trigger
   */
  optimize(trigger) {
    const adjustment = {
      timestamp: new Date().toISOString(),
      trigger,
      changes: []
    };

    switch (trigger) {
      case 'low_satisfaction':
        adjustment.changes.push({
          parameter: 'verbosity',
          from: 'high',
          to: 'medium',
          reason: 'User prefers shorter responses'
        });
        break;
      
      case 'high_error_rate':
        adjustment.changes.push({
          parameter: 'verification',
          from: 'optional',
          to: 'required',
          reason: 'Too many errors detected'
        });
        break;
      
      case 'time_pattern':
        const peakHours = this.patterns.behaviors
          .filter(b => b.type === 'time_preference')
          .map(b => b.value);
        
        adjustment.changes.push({
          parameter: 'proactive_hours',
          from: 'none',
          to: peakHours.join(', '),
          reason: 'User active during these hours'
        });
        break;
    }

    this.adjustments.push(adjustment);
    
    // Log optimization
    console.log('🧠 Auto-optimization applied:');
    for (const change of adjustment.changes) {
      console.log(`   ${change.parameter}: ${change.from} → ${change.to}`);
    }
  }

  /**
   * Get current optimization state
   */
  getOptimizationState() {
    return {
      totalInteractions: this.feedback.interactions.length,
      averageSatisfaction: this.calculateAverageSatisfaction(),
      topPatterns: this.patterns.behaviors.slice(0, 5),
      recentAdjustments: this.adjustments.slice(-5),
      recommendations: this.generateRecommendations()
    };
  }

  calculateAverageSatisfaction() {
    const recent = this.feedback.interactions.slice(-50);
    if (recent.length === 0) return 0;
    return recent.reduce((a, b) => a + b.satisfaction, 0) / recent.length;
  }

  generateRecommendations() {
    const recs = [];
    
    if (this.calculateAverageSatisfaction() < 0.7) {
      recs.push('Consider reducing verbosity');
    }
    
    const peakHours = this.patterns.behaviors
      .filter(b => b.type === 'time_preference');
    
    if (peakHours.length > 0) {
      recs.push(`Pre-load data at ${peakHours[0].value}`);
    }
    
    return recs;
  }

  /**
   * Apply learned preferences to response
   */
  applyPreferences(response) {
    let optimized = response;
    
    // Check verbosity preference
    const recent = this.feedback.interactions.slice(-20);
    const negativeFeedback = recent.filter(i => i.satisfaction < 0.4);
    const verbosityComplaints = negativeFeedback.filter(i => 
      i.message?.includes('verbose') || i.message?.includes('long')
    );
    
    if (verbosityComplaints.length > 3) {
      // Compress response
      optimized = this.compressResponse(optimized);
    }
    
    return optimized;
  }

  compressResponse(response) {
    // Simple compression: remove redundant lines, use bullets
    const lines = response.split('\n');
    const compressed = lines
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .join('\n');
    
    return compressed;
  }
}

module.exports = SelfImprovingAgent;
