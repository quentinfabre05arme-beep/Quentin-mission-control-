/**
 * PROJECT CLAW CORE — Stripe Agent
 * Stripe CLI/API wrapper (read-only by default).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'stripe_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class StripeAgent {
  constructor(config = {}) {
    this.secretKey = config.secretKey || process.env.STRIPE_SECRET_KEY;
    this.readOnly = config.readOnly !== false;
  }
  
  status() {
    log('Checking Stripe configuration');
    return {
      success: !!this.secretKey,
      readOnly: this.readOnly,
      note: 'Set STRIPE_SECRET_KEY for live access. Read-only mode prevents charges/refunds.',
      hasKey: !!this.secretKey
    };
  }
  
  // NEVER call write endpoints without explicit user approval per transaction
  createCharge() {
    if (this.readOnly) {
      return { success: false, error: 'Write operations disabled in read-only mode' };
    }
    return { success: false, error: 'Charges require explicit per-transaction user approval' };
  }
}

module.exports = { StripeAgent };

if (require.main === module) {
  const stripe = new StripeAgent();
  console.log(JSON.stringify(stripe.status(), null, 2));
}
