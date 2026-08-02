/**
 * PROJECT CLAW CORE — Circuit Breaker
 * Resilience wrapper for external API calls.
 */

class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold || 5;
    this.timeoutMs = options.timeoutMs || 30000;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
  }
  
  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await Promise.race([
        this.fn(...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.timeoutMs)
        )
      ]);
      this.onSuccess();
      return result;
    } catch(e) {
      this.onFailure();
      throw e;
    }
  }
  
  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.halfOpenCalls = 0;
      }
    } else {
      this.failures = Math.max(0, this.failures - 1);
    }
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls
    };
  }
}

module.exports = { CircuitBreaker };

if (require.main === module) {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls <= 3) throw new Error('fail');
    return 'success';
  };
  
  const breaker = new CircuitBreaker(flaky, { failureThreshold: 2, resetTimeoutMs: 1000 });
  
  (async () => {
    for (let i = 0; i < 6; i++) {
      try {
        const r = await breaker.call();
        console.log(`Call ${i}: ${r}`);
      } catch(e) {
        console.log(`Call ${i}: ${e.message}`);
      }
      console.log('Status:', breaker.getStatus());
    }
  })();
}
