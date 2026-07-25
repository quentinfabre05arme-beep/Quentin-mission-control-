const message = require('openclaw').message;

/**
 * Customer Service Bot
 * Version: 1.0
 * Automated customer service with smart routing
 */

class CustomerServiceBot {
  constructor(config = {}) {
    this.config = {
      channels: config.channels || {},
      faq: config.faq || { confidence_threshold: 0.85 },
      escalation: config.escalation || {},
      response: config.response || { max_length: 500 }
    };
    
    this.faqDatabase = new Map();
    this.tickets = new Map();
    this.conversations = new Map();
    this.analytics = {
      totalMessages: 0,
      autoResolved: 0,
      escalated: 0,
      avgResponseTime: 0
    };
  }

  // Add FAQ entry
  addFAQ(question, answer, category = 'general', tags = []) {
    const id = `faq_${Date.now()}`;
    this.faqDatabase.set(id, {
      id,
      question: question.toLowerCase(),
      answer,
      category,
      tags: tags.map(t => t.toLowerCase()),
      usageCount: 0,
      createdAt: new Date().toISOString()
    });
    return id;
  }

  // Find best matching FAQ
  findFAQ(query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    let bestMatch = null;
    let bestScore = 0;

    for (const [id, faq] of this.faqDatabase) {
      let score = 0;
      
      // Exact match bonus
      if (faq.question === queryLower) {
        score += 100;
      }
      
      // Word overlap
      const faqWords = faq.question.split(/\s+/);
      const overlap = queryWords.filter(w => faqWords.includes(w)).length;
      score += overlap * 10;
      
      // Tag matching
      const tagMatch = queryWords.filter(w => faq.tags.includes(w)).length;
      score += tagMatch * 5;
      
      // Usage boost (popular FAQs rank higher)
      score += faq.usageCount * 2;

      if (score > bestScore && score >= 20) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    const confidence = bestScore > 0 ? Math.min(1, bestScore / 100) : 0;
    
    return {
      match: bestMatch,
      confidence,
      score: bestScore
    };
  }

  // Analyze sentiment
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'thanks', 'helpful', 'love', 'amazing', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'angry', 'frustrated', 'useless', 'broken'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'refund', 'compensation', 'legal', 'lawsuit'];
    
    const words = text.toLowerCase().split(/\s+/);
    
    let positive = 0;
    let negative = 0;
    let urgent = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positive++;
      if (negativeWords.includes(word)) negative++;
      if (urgentWords.includes(word)) urgent++;
    });
    
    let sentiment = 'neutral';
    let score = 0;
    
    if (positive > negative) {
      sentiment = 'positive';
      score = positive - negative;
    } else if (negative > positive) {
      sentiment = 'negative';
      score = negative - positive;
    }
    
    if (urgent > 0) {
      sentiment = 'urgent';
      score += urgent * 2;
    }
    
    return { sentiment, score, positive, negative, urgent };
  }

  // Check if escalation needed
  shouldEscalate(message, sentiment) {
    const triggers = this.config.escalation.triggers || [
      'frustrated', 'angry', 'refund', 'complaint', 'legal', 'terrible', 'awful'
    ];
    
    const messageLower = message.toLowerCase();
    const hasTrigger = triggers.some(t => messageLower.includes(t));
    
    return {
      escalate: hasTrigger || sentiment.sentiment === 'urgent' || sentiment.score >= 3,
      reason: hasTrigger ? 'keyword_trigger' : sentiment.sentiment === 'urgent' ? 'urgent_sentiment' : 'high_negative_score',
      priority: sentiment.sentiment === 'urgent' ? 'urgent' : 'high'
    };
  }

  // Handle incoming message
  async handleMessage(messageData) {
    const startTime = Date.now();
    
    const { customer_id, channel, message, timestamp } = messageData;
    
    // Get or create conversation
    if (!this.conversations.has(customer_id)) {
      this.conversations.set(customer_id, {
        id: customer_id,
        messages: [],
        sentiment: 'neutral',
        escalated: false
      });
    }
    
    const conversation = this.conversations.get(customer_id);
    conversation.messages.push({
      role: 'customer',
      text: message,
      timestamp
    });
    
    this.analytics.totalMessages++;
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(message);
    conversation.sentiment = sentiment.sentiment;
    
    // Check escalation
    const escalation = this.shouldEscalate(message, sentiment);
    
    if (escalation.escalate) {
      conversation.escalated = true;
      this.analytics.escalated++;
      
      const ticket = this.createTicket(customer_id, message, escalation, channel);
      
      return {
        reply: this.config.faq.fallback_message || "I'm connecting you with a specialist who can help you better...",
        actions: ['escalate'],
        ticket: ticket.id,
        priority: escalation.priority,
        sentiment: sentiment.sentiment
      };
    }
    
    // Find FAQ match
    const faqResult = this.findFAQ(message);
    
    if (faqResult.confidence >= this.config.faq.confidence_threshold) {
      // Auto-resolve with FAQ
      faqResult.match.usageCount++;
      this.analytics.autoResolved++;
      
      const responseTime = Date.now() - startTime;
      this.updateAvgResponseTime(responseTime);
      
      return {
        reply: faqResult.match.answer,
        actions: ['auto_resolved'],
        confidence: faqResult.confidence,
        faq_id: faqResult.match.id,
        sentiment: sentiment.sentiment
      };
    }
    
    // No good match - escalate or provide generic response
    if (faqResult.confidence > 0.5) {
      // Partial match - provide best guess
      return {
        reply: `I think you're asking about: "${faqResult.match.question}"\n\n${faqResult.match.answer}\n\nDid this help? If not, I can connect you with a specialist.`,
        actions: ['partial_match'],
        confidence: faqResult.confidence,
        sentiment: sentiment.sentiment
      };
    }
    
    // No match at all
    return {
      reply: "I want to make sure you get the right answer. Let me connect you with a team member who can help...",
      actions: ['no_match', 'escalate'],
      priority: 'medium',
      sentiment: sentiment.sentiment
    };
  }

  // Create support ticket
  createTicket(customerId, message, escalation, channel) {
    const ticket = {
      id: `ticket_${Date.now()}`,
      customerId,
      message,
      reason: escalation.reason,
      priority: escalation.priority,
      channel,
      status: 'open',
      createdAt: new Date().toISOString(),
      assignedTo: null,
      resolvedAt: null
    };
    
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  // Update average response time
  updateAvgResponseTime(newTime) {
    const current = this.analytics.avgResponseTime;
    const total = this.analytics.totalMessages;
    this.analytics.avgResponseTime = (current * (total - 1) + newTime) / total;
  }

  // Get analytics
  getAnalytics(period = 'daily') {
    const now = new Date();
    const conversations = Array.from(this.conversations.values());
    
    const relevant = conversations.filter(c => {
      const lastMessage = c.messages[c.messages.length - 1];
      if (!lastMessage) return false;
      
      const msgDate = new Date(lastMessage.timestamp);
      const diff = now - msgDate;
      
      switch (period) {
        case 'daily': return diff < 24 * 60 * 60 * 1000;
        case 'weekly': return diff < 7 * 24 * 60 * 60 * 1000;
        case 'monthly': return diff < 30 * 24 * 60 * 60 * 1000;
        default: return true;
      }
    });
    
    const escalated = relevant.filter(c => c.escalated).length;
    const resolved = relevant.filter(c => !c.escalated).length;
    
    return {
      period,
      totalConversations: relevant.length,
      autoResolved: resolved,
      escalated,
      resolutionRate: relevant.length > 0 ? (resolved / relevant.length * 100).toFixed(1) : 0,
      avgResponseTime: Math.round(this.analytics.avgResponseTime),
      sentiment: {
        positive: relevant.filter(c => c.sentiment === 'positive').length,
        negative: relevant.filter(c => c.sentiment === 'negative').length,
        neutral: relevant.filter(c => c.sentiment === 'neutral').length,
        urgent: relevant.filter(c => c.sentiment === 'urgent').length
      }
    };
  }

  // Send message to customer
  async sendMessage(channel, target, text) {
    if (channel === 'telegram') {
      await message({
        action: "send",
        target: target,
        message: text
      });
    }
    // Add other channels as needed
  }
}

module.exports = CustomerServiceBot;

// CLI usage
if (require.main === module) {
  const cs = new CustomerServiceBot({
    faq: { confidence_threshold: 0.85 },
    escalation: {
      triggers: ['frustrated', 'angry', 'refund', 'complaint', 'legal']
    }
  });

  // Add sample FAQs
  cs.addFAQ(
    'How do I reset my password?',
    'Click "Forgot Password" on the login page and follow the email instructions.',
    'account',
    ['password', 'reset', 'login']
  );

  cs.addFAQ(
    'What are your business hours?',
    'We are available Monday-Friday 9AM-6PM CET, Saturday 10AM-4PM CET.',
    'general',
    ['hours', 'time', 'support']
  );

  cs.addFAQ(
    'How do I upgrade my plan?',
    'Go to Settings > Billing > Upgrade Plan and select your new tier.',
    'billing',
    ['upgrade', 'plan', 'pricing']
  );

  (async () => {
    console.log('🤖 Customer Service Bot v1.0');
    console.log('===========================\n');

    // Test 1: FAQ match
    console.log('1. Testing FAQ match...');
    const response1 = await cs.handleMessage({
      customer_id: 'cust_123',
      channel: 'telegram',
      message: 'How do I reset my password?',
      timestamp: new Date().toISOString()
    });
    console.log('Response:', response1.reply.substring(0, 100) + '...');
    console.log('Actions:', response1.actions);
    console.log();

    // Test 2: Escalation
    console.log('2. Testing escalation...');
    const response2 = await cs.handleMessage({
      customer_id: 'cust_456',
      channel: 'telegram',
      message: 'This is terrible! I want a refund immediately!',
      timestamp: new Date().toISOString()
    });
    console.log('Response:', response2.reply);
    console.log('Actions:', response2.actions);
    console.log('Priority:', response2.priority);
    console.log();

    // Test 3: Analytics
    console.log('3. Analytics:');
    const analytics = cs.getAnalytics('daily');
    console.log(JSON.stringify(analytics, null, 2));
  })();
}