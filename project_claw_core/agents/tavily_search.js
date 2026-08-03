/**
 * TAVILY SEARCH CLIENT v1.0
 * Uses Tavily AI Search API. Free tier: 1,000 requests/month.
 * Reads TAVILY_API_KEY from environment or credential_manager.
 */

const https = require('https');
const { URL } = require('url');
const path = require('path');

function getApiKey() {
  if (process.env.TAVILY_API_KEY) return process.env.TAVILY_API_KEY;
  try {
    const { getCredential } = require(path.join(__dirname, '..', '..', 'credential_manager'));
    const cred = getCredential('tavily_api_key');
    return cred ? cred.password : null;
  } catch (e) {
    return null;
  }
}

function request(query, { count = 5, searchDepth = 'basic', includeAnswer = false, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) return resolve({ source: 'tavily', results: [], error: 'TAVILY_API_KEY not set' });

    const payload = JSON.stringify({
      query,
      max_results: count,
      search_depth: searchDepth,
      include_answer: includeAnswer
    });

    const parsed = new URL('https://api.tavily.com/search');
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: timeoutMs
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return resolve({ source: 'tavily', results: [], error: `HTTP ${res.statusCode}: ${data.slice(0, 200)}` });
        }
        try {
          const parsed = JSON.parse(data);
          const results = (parsed.results || []).map(r => ({
            title: r.title || '',
            link: r.url || '',
            snippet: r.content || r.snippet || '',
            score: r.score,
            source: 'tavily'
          }));
          if (includeAnswer && parsed.answer) {
            results.unshift({ title: 'Tavily Answer', link: '', snippet: parsed.answer, source: 'tavily' });
          }
          resolve({ source: 'tavily', results, answer: parsed.answer });
        } catch (e) {
          resolve({ source: 'tavily', results: [], error: e.message });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', e => reject(e));
    req.write(payload);
    req.end();
  });
}

module.exports = { request, search: request, getApiKey };

if (require.main === module) {
  const query = process.argv[2] || 'latest AI news';
  request(query, { count: 5, includeAnswer: true }).then(r => {
    console.log(`Tavily returned ${r.results.length} results`);
    if (r.answer) console.log('Answer:', r.answer);
    console.log(JSON.stringify(r.results, null, 2));
  }).catch(e => {
    console.error('Tavily error:', e.message);
    process.exit(1);
  });
}
