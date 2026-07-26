// OOMOL LLM Client - High-performance wrapper
// Uses OOMOL's LLM API for better rate limits and unified billing

const OOMOL_API_KEY = 'api-c0559243d5061e512de1dc6610a3e29951363efd93c064a75925aebbc4b31f7d';
const OOMOL_BASE_URL = 'https://llm.oomol.com/v1';

class OOMOLLLMClient {
  constructor() {
    this.baseUrl = OOMOL_BASE_URL;
    this.apiKey = OOMOL_API_KEY;
    this.model = 'oomol-chat';
    this.requestCount = 0;
    this.lastReset = Date.now();
  }

  // Check rate limit status
  checkRateLimit() {
    const now = Date.now();
    const hourPassed = now - this.lastReset > 3600000;
    
    if (hourPassed) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    return {
      requestsThisHour: this.requestCount,
      limitPerHour: 1000, // OOMOL has generous limits
      remaining: 1000 - this.requestCount,
      resetIn: 3600000 - (now - this.lastReset)
    };
  }

  async chat(messages, options = {}) {
    const rateLimit = this.checkRateLimit();
    
    if (rateLimit.remaining <= 0) {
      throw new Error(`Rate limit exceeded. Resets in ${Math.ceil(rateLimit.resetIn / 1000)}s`);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 2048,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OOMOL API error: ${error}`);
      }

      const data = await response.json();
      this.requestCount++;
      
      return {
        text: data.choices[0]?.message?.content || '',
        usage: data.usage,
        model: data.model,
        rateLimit
      };
    } catch (error) {
      console.error('OOMOL LLM error:', error.message);
      throw error;
    }
  }

  // Quick completion helper
  async complete(prompt, options = {}) {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  // System prompt + user message
  async chatWithSystem(systemPrompt, userMessage, options = {}) {
    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], options);
  }

  // Get client status
  getStatus() {
    return {
      apiKey: `${this.apiKey.substring(0, 12)}...`,
      baseUrl: this.baseUrl,
      model: this.model,
      requestsThisHour: this.requestCount,
      ...this.checkRateLimit()
    };
  }
}

// Export singleton
module.exports = new OOMOLLLMClient();
