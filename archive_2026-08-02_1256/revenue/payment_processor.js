// Autonomous Payment Processing
// Handles Stripe subscriptions, Gumroad webhooks

const Stripe = require('stripe');

class PaymentProcessor {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.prices = {
      newsletter_monthly: 2900, // €29 in cents
      newsletter_yearly: 29000, // €290/year
      api_pro: 2900,
      api_enterprise: 29900
    };
  }

  async createCustomer(email, name) {
    return await this.stripe.customers.create({
      email,
      name,
      metadata: { source: 'autonomous_revenue' }
    });
  }

  async createSubscription(customerId, product) {
    const priceId = this.prices[product];
    return await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: { product }
    });
  }

  async handleWebhook(payload, signature) {
    const event = this.stripe.webhooks.constructEvent(
      payload, signature, process.env.WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object);
        break;
    }

    return { received: true };
  }

  async handlePaymentSuccess(invoice) {
    // Grant access, send welcome email
    console.log(`Payment received: ${invoice.amount_paid}`);
  }

  async getMetrics() {
    const subscriptions = await this.stripe.subscriptions.list({
      status: 'active',
      limit: 100
    });

    const totalMonthly = subscriptions.data.reduce((sum, sub) => {
      return sum + (sub.items.data[0].price.unit_amount / 100);
    }, 0);

    return {
      activeSubscriptions: subscriptions.data.length,
      monthlyRecurringRevenue: totalMonthly,
      currency: 'EUR'
    };
  }
}

module.exports = PaymentProcessor;

// Daily metrics check
if (require.main === module) {
  const processor = new PaymentProcessor();
  processor.getMetrics().then(metrics => {
    console.log('Daily Revenue Metrics:', metrics);
  });
}
