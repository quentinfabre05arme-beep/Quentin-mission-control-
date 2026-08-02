const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Top funds to track
const TARGET_FUNDS = [
  { name: 'Berkshire Hathaway', cik: '0001067983' },
  { name: 'Citadel Advisors', cik: '0001423053' },
  { name: 'Tiger Global Management', cik: '0001167483' },
  { name: 'Bridgewater Associates', cik: '0001350694' },
  { name: 'Renaissance Technologies', cik: '0001037389' },
  { name: 'ARK Investment Management', cik: '0001697748' },
  { name: 'Baupost Group', cik: '0001059308' },
  { name: 'Pershing Square Capital', cik: '0001548305' }
];

class SEC13FScraper {
  constructor() {
    this.baseUrl = 'www.sec.gov';
    this.dataDir = path.join(__dirname, 'data', '13f');
    this.ensureDir();
  }

  async ensureDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch {}
  }

  // Fetch recent 13F filings for a fund
  async fetch13FFilings(cik) {
    return new Promise((resolve, reject) => {
      const paddedCIK = cik.padStart(10, '0');
      const options = {
        hostname: this.baseUrl,
        path: `/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCIK}&type=13F-HR&dateb=&count=5&output=atom`,
        method: 'GET',
        headers: {
          'User-Agent': 'AlphaFund Research contact@alphafund.local'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            // Parse ATOM feed
            const entries = [];
            const entryMatches = data.match(/<entry[^>]*>[\s\S]*?<\/entry>/g) || [];
            
            entryMatches.forEach(entry => {
              const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
              const linkMatch = entry.match(/<link\s+href="([^"]+)"/);
              const dateMatch = entry.match(/<updated>([^<]+)<\/updated>/);
              
              if (titleMatch && linkMatch) {
                entries.push({
                  title: titleMatch[1].trim(),
                  link: linkMatch[1],
                  date: dateMatch ? dateMatch[1] : null
                });
              }
            });
            
            resolve(entries);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });
  }

  // Fetch holdings from a 13F filing
  async fetchHoldings(filingUrl) {
    return new Promise((resolve, reject) => {
      const url = new URL(filingUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'AlphaFund Research contact@alphafund.local'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Parse XML holdings data
          const holdings = [];
          const infoTableMatches = data.match(/<infoTable[^>]*>[\s\S]*?<\/infoTable>/g) || [];
          
          infoTableMatches.forEach(table => {
            const nameMatch = table.match(/<nameOfIssuer>([^<]+)<\/nameOfIssuer>/);
            const tickerMatch = table.match(/<cusip>([^<]+)<\/cusip>/);
            const sharesMatch = table.match(/<shrsOrPrnAmt[^>]*>[\s\S]*?<prnAmount>([^<]+)<\/prnAmount>/);
            const valueMatch = table.match(/<value>([^<]+)<\/value>/);
            
            if (nameMatch && sharesMatch) {
              holdings.push({
                issuer: nameMatch[1].trim(),
                cusip: tickerMatch ? tickerMatch[1] : null,
                shares: parseInt(sharesMatch[1].replace(/,/g, '')),
                value: valueMatch ? parseInt(valueMatch[1]) * 1000 : null
              });
            }
          });
          
          resolve(holdings);
        });
      });

      req.on('error', () => resolve([]));
      req.setTimeout(15000, () => { req.destroy(); resolve([]); });
      req.end();
    });
  }

  // Track all funds
  async trackAllFunds() {
    const results = [];
    
    for (const fund of TARGET_FUNDS) {
      try {
        console.log(`Fetching ${fund.name}...`);
        const filings = await this.fetch13FFilings(fund.cik);
        
        if (filings.length > 0) {
          // Get most recent filing
          const latest = filings[0];
          const holdings = await this.fetchHoldings(latest.link);
          
          results.push({
            fund: fund.name,
            cik: fund.cik,
            latestFiling: latest.date,
            topHoldings: holdings.slice(0, 10),
            totalHoldings: holdings.length
          });
          
          // Save to file
          await fs.writeFile(
            path.join(this.dataDir, `${fund.cik}_latest.json`),
            JSON.stringify({ fund: fund.name, holdings }, null, 2)
          );
        }
        
        // Rate limit
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (err) {
        console.log(`Error fetching ${fund.name}: ${err.message}`);
      }
    }
    
    return results;
  }

  // Compare quarterly changes
  async detectChanges() {
    const changes = [];
    
    for (const fund of TARGET_FUNDS) {
      try {
        const currentFile = path.join(this.dataDir, `${fund.cik}_latest.json`);
        const prevFile = path.join(this.dataDir, `${fund.cik}_previous.json`);
        
        const current = JSON.parse(await fs.readFile(currentFile, 'utf8'));
        let previous = null;
        
        try {
          previous = JSON.parse(await fs.readFile(prevFile, 'utf8'));
        } catch {}
        
        if (previous) {
          const newBuys = current.holdings.filter(c => 
            !previous.holdings.some(p => p.cusip === c.cusip)
          );
          
          const sells = previous.holdings.filter(p => 
            !current.holdings.some(c => c.cusip === p.cusip)
          );
          
          if (newBuys.length > 0 || sells.length > 0) {
            changes.push({
              fund: fund.name,
              newBuys: newBuys.slice(0, 5),
              sells: sells.slice(0, 5)
            });
          }
        }
        
        // Archive current as previous
        await fs.copyFile(currentFile, prevFile);
        
      } catch {}
    }
    
    return changes;
  }
}

// Run scraper
(async () => {
  const scraper = new SEC13FScraper();
  
  console.log('=== SEC 13F TRACKER ===\n');
  console.log('Fetching latest filings...\n');
  
  const results = await scraper.trackAllFunds();
  
  console.log('\n=== SUMMARY ===\n');
  
  results.forEach(r => {
    console.log(`${r.fund}:`);
    console.log(`  Latest: ${r.latestFiling || 'N/A'}`);
    console.log(`  Holdings: ${r.totalHoldings}`);
    if (r.topHoldings.length > 0) {
      console.log(`  Top: ${r.topHoldings[0].issuer} ($${r.topHoldings[0].value ? (r.topHoldings[0].value/1000000).toFixed(1) : '?'}M)`);
    }
    console.log();
  });
  
  // Check for changes
  const changes = await scraper.detectChanges();
  
  if (changes.length > 0) {
    console.log('=== CHANGES DETECTED ===\n');
    changes.forEach(c => {
      console.log(`${c.fund}:`);
      if (c.newBuys.length > 0) {
        console.log(`  New buys: ${c.newBuys.map(b => b.issuer).join(', ')}`);
      }
      if (c.sells.length > 0) {
        console.log(`  Sells: ${c.sells.map(s => s.issuer).join(', ')}`);
      }
    });
  }
  
  console.log(`\nSaved to: ${scraper.dataDir}`);
})();
