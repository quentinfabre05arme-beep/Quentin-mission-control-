/**
 * Bing HTML Researcher v1.0
 * Free web search via Bing HTML scraping. No API key required.
 */

const https = require('https');
const { URL } = require('url');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SEARCH_URL = 'https://www.bing.com/search?q=';

function fetchHtml(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.bing.com/'
      },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function stripHtml(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^\u003e]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseResults(html, max = 5) {
  const results = [];
  // Bing result blocks: class="b_algo"
  const regex = /<li class="b_algo"[\s\S]*?<\/li>/g;
  const blocks = html.match(regex) || [];

  for (const block of blocks.slice(0, max)) {
    const titleMatch = block.match(/<h2>\s*<a[^\u003e]*href="([^"]+)"[^\u003e]*>([\s\S]*?)<\/a>\s*<\/h2>/);
    const snippetMatch = block.match(/<div class="b_caption"\u003e\s*<p>([\s\S]*?)<\/p>/);
    if (titleMatch) {
      results.push({
        title: stripHtml(titleMatch[2]),
        link: titleMatch[1],
        snippet: snippetMatch ? stripHtml(snippetMatch[1]) : '',
        source: 'bing_html'
      });
    }
  }
  return results;
}

async function search(query, count = 5, timeoutMs = 15000) {
  const url = SEARCH_URL + encodeURIComponent(query);
  const html = await fetchHtml(url, timeoutMs);
  return parseResults(html, count);
}

module.exports = { search, fetchHtml, parseResults };

if (require.main === module) {
  const query = process.argv[2] || 'OpenClaw agent framework';
  search(query, 5).then(r => {
    console.log(`Bing returned ${r.length} results`);
    console.log(JSON.stringify(r, null, 2));
  }).catch(e => {
    console.error('Bing error:', e.message);
    process.exit(1);
  });
}
