/**
 * Web Research Assistant
 * Advanced web research using web_fetch
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache', 'web_research');

class WebResearchAssistant {
  constructor() {
    this.cache = {};
    this.loadCache();
  }

  loadCache() {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
        this.cache[data.url] = data;
      } catch (e) {
        // Ignore corrupt cache files
      }
    }
  }

  async research({ topic, sources, depth = 'standard' }) {
    console.log(`🔬 Researching: ${topic}`);
    console.log(`   Sources: ${sources.length}`);
    console.log(`   Depth: ${depth}`);

    const results = [];
    
    for (const url of sources) {
      try {
        const content = await this.fetchWithCache(url);
        const extracted = this.extractInformation(content, topic);
        results.push({
          url,
          title: extracted.title || 'Unknown',
          keyPoints: extracted.keyPoints,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`Failed to fetch ${url}: ${error.message}`);
      }
    }

    return {
      topic,
      depth,
      sourcesConsulted: results.length,
      findings: this.synthesizeFindings(results),
      rawResults: results
    };
  }

  async fetchWithCache(url) {
    // Check cache first
    const cached = this.cache[url];
    if (cached && this.isCacheValid(cached)) {
      console.log(`   📋 Cache hit: ${url}`);
      return cached.content;
    }

    // Fetch fresh
    console.log(`   🌐 Fetching: ${url}`);
    const content = await this.fetchUrl(url);
    
    // Save to cache
    this.saveToCache(url, content);
    
    return content;
  }

  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: new URL(url).hostname,
        path: new URL(url).pathname + new URL(url).search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Timeout')));
      req.end();
    });
  }

  extractInformation(html, topic) {
    // Simple extraction - in practice would use proper HTML parser
    const title = html.match(/<title>([^]*?)<\/title>/i)?.[1] || 'No title';
    
    // Extract paragraphs
    const paragraphs = html.match(/<p[^]*?>([^]*?)<\/p>/gi) || [];
    const text = paragraphs.slice(0, 5).join(' ').replace(/<[^]*?>/g, ' ');
    
    // Extract key points (sentences containing topic keywords)
    const keywords = topic.toLowerCase().split(' ');
    const sentences = text.split(/[.!?]+/).filter(s => s.length > 20);
    const keyPoints = sentences.filter(s => 
      keywords.some(k => s.toLowerCase().includes(k))
    ).slice(0, 5);

    return {
      title: title.substring(0, 100),
      keyPoints: keyPoints.map(p => p.trim().substring(0, 200))
    };
  }

  synthesizeFindings(results) {
    const allPoints = results.flatMap(r => r.keyPoints);
    
    // Remove duplicates
    const unique = [...new Set(allPoints)];
    
    // Sort by relevance (length as proxy)
    return unique.sort((a, b) => b.length - a.length).slice(0, 10);
  }

  isCacheValid(cached) {
    const age = Date.now() - new Date(cached.timestamp).getTime();
    return age < 3600000; // 1 hour
  }

  saveToCache(url, content) {
    const entry = {
      url,
      content: content.substring(0, 10000), // Limit size
      timestamp: new Date().toISOString()
    };
    
    const filename = Buffer.from(url).toString('base64').substring(0, 50) + '.json';
    fs.writeFileSync(path.join(CACHE_DIR, filename), JSON.stringify(entry));
    
    this.cache[url] = entry;
  }
}

module.exports = WebResearchAssistant;
