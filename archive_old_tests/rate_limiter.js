/**
 * PROJECT CLAW CORE — Rate Limiter
 * Token bucket + simple concurrency limiter.
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 10;
    this.refillRate = options.refillRate || 1; // tokens per second
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.pending = 0;
    this.maxConcurrent = options.maxConcurrent || 3;
  }
  
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
  
  async acquire(tokens = 1) {
    this.refill();
    while (this.tokens < tokens || this.pending >= this.maxConcurrent) {
      await new Promise(r => setTimeout(r, 50));
      this.refill();
    }
    this.tokens -= tokens;
    this.pending++;
    return {
      release: () => {
        this.pending = Math.max(0, this.pending - 1);
      }
    };
  }
  
  async run(fn, tokens = 1) {
    const ticket = await this.acquire(tokens);
    try {
      return await fn();
    } finally {
      ticket.release();
    }
  }
  
  getStatus() {
    this.refill();
    return {
      tokens: this.tokens.toFixed(2),
      pending: this.pending,
      maxTokens: this.maxTokens,
      maxConcurrent: this.maxConcurrent,
      refillRate: this.refillRate
    };
  }
  async allow(key) {
    const ticket = await this.acquire(1);
    ticket.release();
    return { success: true, allowed: true, key };
  }
}

module.exports = { RateLimiter };

if (require.main === module) {
  (async () => {
    const limiter = new RateLimiter({ maxTokens: 3, refillRate: 1 });
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await limiter.run(async () => {
        await new Promise(r => setTimeout(r, 100));
        return `task-${i}`;
      }));
    }
    console.log('Results:', results);
    console.log('Status:', limiter.getStatus());
  })();
}
