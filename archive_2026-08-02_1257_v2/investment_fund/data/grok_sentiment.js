const https = require('https');

class GrokSentiment {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'api.x.ai';
  }

  async analyzeSentiment(query) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        messages: [{
          role: 'user',
          content: `Analyze X/Twitter sentiment for "${query}". Return JSON: {"sentiment": "bullish/bearish/neutral", "score": 0-100, "volume": "high/medium/low", "trending": ["topic1", "topic2"], "influencers": ["@handle1", "@handle2"]}`
        }],
        model: 'grok-beta',
        stream: false
      });

      const options = {
        hostname: this.baseUrl,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `***`
        }
      };

      const req = https.request(options, (res) => {
        let response = '';
        res.on('data', chunk => response += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(response);
            const content = json.choices?.[0]?.message?.content || '{}';
            const sentiment = JSON.parse(content);
            resolve(sentiment);
          } catch (e) {
            resolve({ sentiment: 'neutral', score: 50, error: e.message });
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async getCryptoSentiment(symbol) {
    const query = `$${symbol.toLowerCase()} crypto twitter sentiment today`;
    return this.analyzeSentiment(query);
  }

  async getStockSentiment(symbol) {
    const query = `$${symbol.toUpperCase()} stock twitter sentiment today`;
    return this.analyzeSentiment(query);
  }
}

module.exports = GrokSentiment;