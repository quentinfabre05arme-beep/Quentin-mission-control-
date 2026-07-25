/**
 * OpenClaw Subscription Manager
 * Handles tiered subscriptions, billing, and customer lifecycle
 * Version 1.0 | July 25, 2026
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SubscriptionManager {
  constructor(config = {}) {
    this.config = {
      dataDir: config.dataDir || './data',
      stripeWebhookSecret: config.stripeWebhookSecret || null,
      ...config
    };
    
    this.subscribers = new Map();
    this.subscriptions = new Map();
    this.pricingTiers = this.getDefaultPricing();
    
    this.initialize();
  }

  async initialize() {
    console.log('[SUBSCRIPTION] Initializing subscription manager...');
    await this.loadSubscribers();
    await this.loadSubscriptions();
    console.log('[SUBSCRIPTION] Manager initialized');
  }

  getDefaultPricing() {
    return {
      basic: {
        id: 'basic',
        name: 'Basic Research',
        price: 29,
        currency: 'USD',
        interval: 'month',
        features: [
          'Weekly market reports',
          'Email delivery',
          'Basic technical analysis',
          'Community access'
        ],
        limits: {
          reports_per_week: 1,
          api_calls_per_day: 100
        }
      },
      pro: {
        id: 'pro',
        name: 'Pro Intelligence',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Daily market reports',
          'Real-time alerts',
          'Advanced technical analysis',
          'Sentiment analysis',
          'API access (1K calls/day)',
          'Priority support'
        ],
        limits: {
          reports_per_day: 1,
          api_calls_per_day: 1000,
          alerts_enabled: true
        }
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise Suite',
        price: 499,
        currency: 'USD',
        interval: 'month',
        features: [
          'Custom research requests',
          'Unlimited API access',
          'White-label reports',
          'Dedicated account manager',
          'Team management',
          'SLA guarantee',
          'On-premise deployment option'
        ],
        limits: {
          reports_unlimited: true,
          api_calls_unlimited: true,
          custom_requests: true,
          team_members: 10
        }
      }
    };
  }

  async loadSubscribers() {
    try {
      const filePath = path.join(this.config.dataDir, 'subscribers.json');
      const data = await fs.readFile(filePath, 'utf8');
      const subscribers = JSON.parse(data);
      
      for (const sub of subscribers) {
        this.subscribers.set(sub.id, sub);
      }
      
      console.log(`[SUBSCRIPTION] Loaded ${this.subscribers.size} subscribers`);
    } catch (error) {
      console.log('[SUBSCRIPTION] No existing subscribers found');
    }
  }

  async loadSubscriptions() {
    try {
      const filePath = path.join(this.config.dataDir, 'subscriptions.json');
      const data = await fs.readFile(filePath, 'utf8');
      const subscriptions = JSON.parse(data);
      
      for (const sub of subscriptions) {
        this.subscriptions.set(sub.id, sub);
      }
      
      console.log(`[SUBSCRIPTION] Loaded ${this.subscriptions.size} subscriptions`);
    } catch (error) {
      console.log('[SUBSCRIPTION] No existing subscriptions found');
    }
  }

  // Subscriber Management
  async createSubscriber(data) {
    const id = this.generateId();
    const subscriber = {
      id,
      email: data.email,
      name: data.name || null,
      created_at: new Date().toISOString(),
      status: 'active',
      metadata: data.metadata || {},
      preferences: {
        email_notifications: true,
        alert_channels: ['email'],
        timezone: data.timezone || 'UTC'
      }
    };

    this.subscribers.set(id, subscriber);
    await this.saveSubscribers();
    
    console.log(`[SUBSCRIPTION] Created subscriber: ${subscriber.email}`);
    return subscriber;
  }

  async createSubscription(subscriberId, tierId, paymentMethod = 'stripe') {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) {
      throw new Error(`Subscriber not found: ${subscriberId}`);
    }

    const tier = this.pricingTiers[tierId];
    if (!tier) {
      throw new Error(`Pricing tier not found: ${tierId}`);
    }

    const id = this.generateId();
    const subscription = {
      id,
      subscriber_id: subscriberId,
      tier_id: tierId,
      status: 'trial', // trial -> active -> cancelled
      payment_method: paymentMethod,
      current_period_start: new Date().toISOString(),
      current_period_end: this.calculatePeriodEnd(tier.interval),
      trial_end: this.calculateTrialEnd(),
      cancel_at_period_end: false,
      revenue: {
        total_billed: 0,
        total_paid: 0,
        last_payment: null,
        next_payment: this.calculatePeriodEnd(tier.interval)
      },
      usage: {
        api_calls_today: 0,
        reports_this_period: 0,
        last_reset: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    this.subscriptions.set(id, subscription);
    await this.saveSubscriptions();
    
    console.log(`[SUBSCRIPTION] Created ${tierId} subscription for ${subscriber.email}`);
    return subscription;
  }

  async activateSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    subscription.status = 'active';
    subscription.trial_end = null;
    subscription.revenue.last_payment = new Date().toISOString();
    
    const tier = this.pricingTiers[subscription.tier_id];
    subscription.revenue.total_paid += tier.price;
    subscription.revenue.total_billed += tier.price;

    await this.saveSubscriptions();
    
    console.log(`[SUBSCRIPTION] Activated subscription: ${subscriptionId}`);
    return subscription;
  }

  async cancelSubscription(subscriptionId, reason = null) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    subscription.status = 'cancelled';
    subscription.cancelled_at = new Date().toISOString();
    subscription.cancellation_reason = reason;

    await this.saveSubscriptions();
    
    console.log(`[SUBSCRIPTION] Cancelled subscription: ${subscriptionId}`);
    return subscription;
  }

  // Billing & Revenue
  async processBilling() {
    const now = new Date();
    const dueSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.status === 'active' && 
        new Date(sub.revenue.next_payment) <= now
      );

    console.log(`[BILLING] Processing ${dueSubscriptions.length} subscriptions`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      revenue: 0
    };

    for (const subscription of dueSubscriptions) {
      try {
        const tier = this.pricingTiers[subscription.tier_id];
        
        // Simulate payment processing
        const paymentResult = await this.processPayment(subscription, tier);
        
        if (paymentResult.success) {
          subscription.revenue.total_paid += tier.price;
          subscription.revenue.total_billed += tier.price;
          subscription.revenue.last_payment = now.toISOString();
          subscription.current_period_start = now.toISOString();
          subscription.current_period_end = this.calculatePeriodEnd(tier.interval);
          subscription.revenue.next_payment = subscription.current_period_end;
          
          // Reset usage counters
          subscription.usage = {
            api_calls_today: 0,
            reports_this_period: 0,
            last_reset: now.toISOString()
          };
          
          results.succeeded++;
          results.revenue += tier.price;
        } else {
          subscription.status = 'past_due';
          results.failed++;
        }
        
        results.processed++;
      } catch (error) {
        console.error(`[BILLING] Failed to process subscription ${subscription.id}:`, error.message);
        results.failed++;
      }
    }

    await this.saveSubscriptions();
    
    console.log(`[BILLING] Processed: ${results.processed}, Succeeded: ${results.succeeded}, Failed: ${results.failed}, Revenue: $${results.revenue.toFixed(2)}`);
    return results;
  }

  async processPayment(subscription, tier) {
    // Placeholder for actual payment processing
    // In production, this would integrate with Stripe, PayPal, etc.
    
    console.log(`[PAYMENT] Processing $${tier.price} for subscription ${subscription.id}`);
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    return {
      success,
      transaction_id: success ? this.generateId() : null,
      amount: tier.price,
      currency: tier.currency
    };
  }

  // Usage Tracking
  async trackApiUsage(subscriptionId, endpoint, count = 1) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    const tier = this.pricingTiers[subscription.tier_id];
    const limit = tier.limits.api_calls_per_day;
    
    if (limit !== undefined && subscription.usage.api_calls_today + count > limit) {
      return false; // Limit exceeded
    }

    subscription.usage.api_calls_today += count;
    await this.saveSubscriptions();
    
    return true;
  }

  async trackReportUsage(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    const tier = this.pricingTiers[subscription.tier_id];
    
    if (tier.limits.reports_per_day) {
      if (subscription.usage.reports_this_period >= tier.limits.reports_per_day) {
        return false;
      }
    }

    subscription.usage.reports_this_period++;
    await this.saveSubscriptions();
    
    return true;
  }

  // Analytics
  getRevenueMetrics(period = 'month') {
    const now = new Date();
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.status === 'active');

    const metrics = {
      total_mrr: 0,
      total_subscribers: activeSubscriptions.length,
      tier_breakdown: {},
      churn_rate: 0,
      avg_revenue_per_user: 0,
      period
    };

    for (const sub of activeSubscriptions) {
      const tier = this.pricingTiers[sub.tier_id];
      metrics.total_mrr += tier.price;
      
      metrics.tier_breakdown[sub.tier_id] = (metrics.tier_breakdown[sub.tier_id] || 0) + 1;
    }

    metrics.avg_revenue_per_user = metrics.total_subscribers > 0 
      ? metrics.total_mrr / metrics.total_subscribers 
      : 0;

    return metrics;
  }

  // Helpers
  calculatePeriodEnd(interval) {
    const now = new Date();
    switch (interval) {
      case 'month':
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    }
  }

  calculateTrialEnd() {
    const now = new Date();
    return new Date(now.setDate(now.getDate() + 7)).toISOString(); // 7-day trial
  }

  generateId() {
    return crypto.randomUUID();
  }

  async saveSubscribers() {
    const filePath = path.join(this.config.dataDir, 'subscribers.json');
    const data = Array.from(this.subscribers.values());
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async saveSubscriptions() {
    const filePath = path.join(this.config.dataDir, 'subscriptions.json');
    const data = Array.from(this.subscriptions.values());
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // Public API
  getSubscriber(id) {
    return this.subscribers.get(id);
  }

  getSubscription(id) {
    return this.subscriptions.get(id);
  }

  getPricingTiers() {
    return this.pricingTiers;
  }

  getSubscriberSubscriptions(subscriberId) {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.subscriber_id === subscriberId);
  }
}

module.exports = SubscriptionManager;

// Example usage
if (require.main === module) {
  async function demo() {
    const manager = new SubscriptionManager({
      dataDir: './mission_control/monetization/data'
    });

    // Create a subscriber
    const subscriber = await manager.createSubscriber({
      email: 'demo@example.com',
      name: 'Demo User'
    });

    // Create a subscription
    const subscription = await manager.createSubscription(
      subscriber.id,
      'pro'
    );

    // Activate it
    await manager.activateSubscription(subscription.id);

    // Show metrics
    const metrics = manager.getRevenueMetrics();
    console.log('\nRevenue Metrics:', JSON.stringify(metrics, null, 2));

    // Process billing
    await manager.processBilling();
  }

  demo().catch(console.error);
}
