const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const PAPERS_DIR = path.join(__dirname, 'papers');

const PAPERS = [
  {
    title: 'The 10 Reasons Most Quantitative Strategies Fail',
    author: 'Lopez de Prado',
    url: 'https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=3043869',
    filename: '10_reasons_quants_fail.pdf'
  },
  {
    title: 'Advances in Financial Machine Learning - Introduction',
    author: 'Lopez de Prado',
    url: 'https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=3104810',
    filename: 'afml_intro.pdf'
  },
  {
    title: 'Optimal Trading Strategies Under Arbitrage',
    author: 'Aldridge, Krawciw',
    url: 'https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=2608884',
    filename: 'optimal_trading_arbitrage.pdf'
  },
  {
    title: 'Risk Management for Trading Strategies',
    author: 'Chan',
    url: 'https://www.quantconnect.com/tutorials/risk-management/',
    filename: 'risk_management_guide.html'
  },
  {
    title: 'Statistical Arbitrage in High Frequency Trading',
    author: 'Gatev, Goetzmann, Rouwenhorst',
    url: 'https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=1416157',
    filename: 'stat_arb_hf.pdf'
  },
  {
    title: 'The Volatility Risk Premium',
    author: 'Carr, Wu',
    url: 'https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=254754',
    filename: 'volatility_risk_premium.pdf'
  },
  {
    title: 'High Frequency Trading and Market Quality',
    author: 'Hendershott, Riordan',
    url: 'https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=1572009',
    filename: 'hf_trading_market_quality.pdf'
  }
];

async function ensureDir() {
  try {
    await fs.mkdir(PAPERS_DIR, { recursive: true });
  } catch {}
}

async function downloadPaper(paper) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'papers.ssrn.com',
      path: paper.url.replace('https://papers.ssrn.com', ''),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      // Follow redirects
      if (res.statusCode === 302 || res.statusCode === 301) {
        const newUrl = new URL(res.headers.location);
        const newOptions = {
          hostname: newUrl.hostname,
          path: newUrl.pathname + newUrl.search,
          method: 'GET',
          headers: options.headers
        };
        
        const newReq = https.request(newOptions, (newRes) => {
          let data = Buffer.alloc(0);
          newRes.on('data', chunk => data = Buffer.concat([data, chunk]));
          newRes.on('end', async () => {
            try {
              const filepath = path.join(PAPERS_DIR, paper.filename);
              await fs.writeFile(filepath, data);
              resolve({ success: true, size: data.length, path: filepath });
            } catch (e) {
              resolve({ success: false, error: e.message });
            }
          });
        });
        
        newReq.on('error', () => resolve({ success: false }));
        newReq.setTimeout(30000, () => { newReq.destroy(); resolve({ success: false }); });
        newReq.end();
        return;
      }

      let data = Buffer.alloc(0);
      res.on('data', chunk => data = Buffer.concat([data, chunk]));
      res.on('end', async () => {
        try {
          const filepath = path.join(PAPERS_DIR, paper.filename);
          await fs.writeFile(filepath, data);
          resolve({ success: true, size: data.length, path: filepath });
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', () => resolve({ success: false }));
    req.setTimeout(30000, () => { req.destroy(); resolve({ success: false }); });
    req.end();
  });
}

async function createNote(paper, result) {
  const notePath = path.join(PAPERS_DIR, paper.filename.replace('.pdf', '.txt'));
  const content = `Title: ${paper.title}
Author: ${paper.author}
Source: SSRN
Downloaded: ${new Date().toISOString()}
Status: ${result.success ? 'Downloaded' : 'Failed'}
File: ${paper.filename}
Size: ${result.success ? (result.size / 1024).toFixed(1) + ' KB' : 'N/A'}

Key Topics:
- TODO: Extract after reading

Notes:
- TODO: Add insights after analysis
`;
  await fs.writeFile(notePath, content);
}

(async () => {
  console.log('=== DOWNLOADING ACADEMIC PAPERS ===\n');
  await ensureDir();
  
  let downloaded = 0;
  let failed = 0;
  
  for (const paper of PAPERS) {
    console.log(`Downloading: ${paper.title}...`);
    
    // Try SSRN first, fallback to placeholder
    let result;
    try {
      result = await downloadPaper(paper);
    } catch {
      result = { success: false };
    }
    
    if (result.success) {
      downloaded++;
      console.log(`  ✅ Downloaded (${(result.size/1024).toFixed(1)} KB)`);
      await createNote(paper, result);
    } else {
      failed++;
      console.log(`  ❌ Failed - will retry later`);
      // Create placeholder
      await createNote(paper, { success: false });
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Downloaded: ${downloaded}/${PAPERS.length}`);
  console.log(`Failed: ${failed}/${PAPERS.length}`);
  console.log(`\nLocation: ${PAPERS_DIR}`);
  
  // Update README
  const readmePath = path.join(__dirname, 'README.md');
  let readme = await fs.readFile(readmePath, 'utf8');
  readme = readme.replace('## Status', `## Papers Downloaded
- ${downloaded} papers from SSRN
- ${failed} pending retry

## Status`);
  await fs.writeFile(readmePath, readme);
})();
