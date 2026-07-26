/**
 * Pattern Extractor
 * Learn from user behavior and automate patterns
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(__dirname, '..', '..', 'memory', 'learned_patterns.json');
const DAILY_NOTES_DIR = path.join(__dirname, '..', '..', 'memory');

class PatternExtractor {
  constructor() {
    this.patterns = this.loadPatterns();
    this.timePatterns = {};
    this.topicPatterns = {};
    this.formatPreferences = {};
  }

  loadPatterns() {
    if (fs.existsSync(PATTERNS_FILE)) {
      return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
    }
    return {
      timeBased: [],
      topicBased: [],
      formatPreferences: {},
      actionChains: [],
      createdAt: new Date().toISOString()
    };
  }

  savePatterns() {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.patterns, null, 2));
  }

  /**
   * Extract patterns from daily notes
   */
  extractFromDailyNotes() {
    const files = fs.readdirSync(DAILY_NOTES_DIR)
      .filter(f => f.match(/\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .slice(-30); // Last 30 days
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(DAILY_NOTES_DIR, file), 'utf8');
      
      // Extract time-based patterns
      this.extractTimePatterns(content);
      
      // Extract topic patterns
      this.extractTopicPatterns(content);
      
      // Extract format preferences
      this.extractFormatPreferences(content);
      
      // Extract action chains
      this.extractActionChains(content);
    }
    
    this.savePatterns();
    return this.patterns;
  }

  extractTimePatterns(content) {
    // Look for time-based patterns like "Check BTC at 9am"
    const timeRegex = /(\d{1,2}[:\d{2}]?\s*(?:am|pm|AM|PM)?)/g;
    const topicRegex = /(?:check|monitor|review|update)\s+([A-Z]{2,5})/gi;
    
    const times = content.match(timeRegex) || [];
    const topics = content.match(topicRegex) || [];
    
    for (const time of times) {
      for (const topic of topics) {
        const cleanTopic = topic.replace(/(?:check|monitor|review|update)\s+/i, '').toUpperCase();
        const key = `${cleanTopic}_${time}`;
        
        if (!this.timePatterns[key]) {
          this.timePatterns[key] = { count: 0, times: [] };
        }
        
        this.timePatterns[key].count++;
        this.timePatterns[key].times.push(time);
      }
    }
    
    // Save strong patterns (3+ occurrences)
    for (const [key, data] of Object.entries(this.timePatterns)) {
      if (data.count >= 3 && !this.patterns.timeBased.find(p => p.id === key)) {
        this.patterns.timeBased.push({
          id: key,
          topic: key.split('_')[0],
          time: key.split('_')[1],
          frequency: data.count,
          confidence: Math.min(data.count / 10, 0.95)
        });
      }
    }
  }

  extractTopicPatterns(content) {
    // Look for recurring topics
    const topicRegex = /(?:BTC|ETH|MSTR|HIMS|AAPL|COIN|crypto|stock|market|research)/gi;
    const topics = content.match(topicRegex) || [];
    
    const topicCounts = {};
    for (const topic of topics) {
      const cleanTopic = topic.toUpperCase();
      topicCounts[cleanTopic] = (topicCounts[cleanTopic] || 0) + 1;
    }
    
    // Save topics mentioned 5+ times
    for (const [topic, count] of Object.entries(topicCounts)) {
      if (count >= 5 && !this.patterns.topicBased.find(p => p.topic === topic)) {
        this.patterns.topicBased.push({
          topic,
          frequency: count,
          confidence: Math.min(count / 20, 0.95)
        });
      }
    }
  }

  extractFormatPreferences(content) {
    // Detect format preferences
    const preferences = {
      likesConcise: /(?:short|brief|concise|quick summary)/i.test(content),
      likesDetailed: /(?:detailed|thorough|comprehensive|full analysis)/i.test(content),
      likesTables: /\|.*\|.*\|/m.test(content),
      likesBulletPoints: /^\s*[-*+]\s+/m.test(content),
      dislikesVerbose: /(?:too long|verbose|wordy)/i.test(content)
    };
    
    for (const [pref, detected] of Object.entries(preferences)) {
      if (detected) {
        this.patterns.formatPreferences[pref] = (this.patterns.formatPreferences[pref] || 0) + 1;
      }
    }
  }

  extractActionChains(content) {
    // Look for common action sequences
    const actionRegex = /(?:then|next|after that|followed by)/i;
    if (actionRegex.test(content)) {
      // Extract sequence of actions
      const sentences = content.split(/[.!?]+/);
      
      for (const sentence of sentences) {
        if (actionRegex.test(sentence)) {
          const actions = sentence.match(/\b(?:check|update|research|analyze|deploy|fix|clean|create)\b/gi);
          if (actions && actions.length >= 2) {
            const chain = actions.map(a => a.toLowerCase()).join(' -> ');
            
            const existing = this.patterns.actionChains.find(c => c.chain === chain);
            if (existing) {
              existing.frequency++;
              existing.confidence = Math.min(existing.frequency / 10, 0.95);
            } else {
              this.patterns.actionChains.push({
                chain,
                frequency: 1,
                confidence: 0.3
              });
            }
          }
        }
      }
    }
  }

  /**
   * Get suggestions based on patterns
   */
  getSuggestions() {
    const suggestions = [];
    
    // Time-based suggestions
    for (const pattern of this.patterns.timeBased) {
      if (pattern.confidence > 0.7) {
        suggestions.push({
          type: 'time_based',
          suggestion: `You often check ${pattern.topic} around ${pattern.time}`,
          action: `Consider auto-loading ${pattern.topic} data at ${pattern.time}`,
          confidence: pattern.confidence
        });
      }
    }
    
    // Topic-based suggestions
    for (const pattern of this.patterns.topicBased.slice(0, 5)) {
      suggestions.push({
        type: 'topic_based',
        suggestion: `You frequently mention ${pattern.topic}`,
        action: `Keep ${pattern.topic} data pre-loaded`,
        confidence: Math.min(pattern.frequency / 20, 0.95)
      });
    }
    
    // Format preferences
    const topFormats = Object.entries(this.patterns.formatPreferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    for (const [format, count] of topFormats) {
      suggestions.push({
        type: 'format_preference',
        suggestion: `You seem to prefer ${format.replace('likes', '').replace('dislikes', 'dislike for ')} format`,
        action: `Auto-apply this format to responses`,
        confidence: Math.min(count / 10, 0.9)
      });
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Pre-load data based on patterns
   */
  getPreloadTasks() {
    const tasks = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const pattern of this.patterns.timeBased) {
      const hour = parseInt(pattern.time);
      if (Math.abs(currentHour - hour) <= 1) {
        tasks.push({
          topic: pattern.topic,
          reason: `You usually check ${pattern.topic} around ${pattern.time}`,
          priority: pattern.confidence > 0.8 ? 'high' : 'medium'
        });
      }
    }
    
    return tasks;
  }
}

module.exports = PatternExtractor;
