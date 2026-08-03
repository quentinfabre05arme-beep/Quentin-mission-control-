/**
 * Opportunity Scanner v2.0
 * Scans for investment and business opportunities
 */
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config', 'opportunities.json');
const LOG_DIR = path.join(__dirname, 'logs');

class OpportunityScanner {
  constructor() {
    this.ensureDirectories();
    this.config = this.loadConfig();
    this.opportunities = [];
  }

  ensureDirectories() {
    [path.join(__dirname, 'config'), LOG_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  loadConfig() {
    const defaultConfig = {
      investment: {
        crypto: {
          enabled: true,
          assets: ['BTC', 'ETH', 'SOL', 'AVAX'],
          min_volume_usd: 10000000, // $10M daily volume
          alert_thresholds: {
            dip: -10,      // Alert on 10% dip
            pump: 15,      // Alert on 15% pump
            volume_spike: 200 // 200% volume increase
          }
        },
        stocks: {
          enabled: true,
          sectors: ['tech', 'biotech', 'energy', 'ai'],
          criteria: {
            pe_ratio_max: 30,
            debt_to_equity_max: 1.0,
            revenue_growth_min: 10
          }
        },
        alternatives: {
          enabled: true,
          types: ['real_estate', 'commodities', 'private_equity'],
          min_investment: 1000
        }
      },
      business: {
        online: {
          enabled: true,
          opportunities: [
            'saas_micro_product',
            'content_monetization',
            'affiliate_partnerships',
            'api_services'
          ]
        },
        arbitrage: {
          enabled: true,
          types: ['crypto_exchange', 'retail', 'regional']
        },
        emerging: {
          enabled: true,
          sectors: ['ai_tools', 'automation', 'data_brokers']
        }
      },
      scoring: {
        roi_weight: 0.3,
        risk_weight: 0.25,
        effort_weight: 0.2,
        timing_weight: 0.15,
        alignment_weight: 0.1
      }
    };

    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
      }
    } catch (e) {
      console.log('Creating default opportunity config');
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  /**
   * Scan for crypto opportunities
   */
  async scanCrypto(data = {}) {
    const opportunities = [];
    const config = this.config.investment.crypto;
    
    if (!config.enabled) return opportunities;

    // Analyze price movements
    config.assets.forEach(asset => {
      const assetData = data[asset] || {};
      const change24h = assetData.change_24h || 0;
      const volume = assetData.volume_24h || 0;
      
      // Dip opportunity
      if (change24h <= config.alert_thresholds.dip) {
        opportunities.push({
          type: 'crypto_dip',
          asset,
          change: change24h,
          signal: 'buy',
          confidence: Math.min(Math.abs(change24h) / 20, 1), // Max confidence at 20% dip
          rationale: `Significant dip of ${change24h}% in ${asset}`,
          urgency: Math.abs(change24h) > 15 ? 'high' : 'medium',
          potential_roi: Math.abs(change24h) * 0.5 // Conservative recovery estimate
        });
      }
      
      // Volume spike opportunity
      if (assetData.volume_change && assetData.volume_change > config.alert_thresholds.volume_spike) {
        opportunities.push({
          type: 'crypto_volume_spike',
          asset,
          volume_change: assetData.volume_change,
          signal: 'investigate',
          confidence: 0.6,
          rationale: `Unusual volume activity: ${assetData.volume_change}% increase`,
          urgency: 'medium',
          potential_roi: 10 // Neutral estimate
        });
      }
    });

    return opportunities;
  }

  /**
   * Scan for stock opportunities
   */
  async scanStocks(data = {}) {
    const opportunities = [];
    const config = this.config.investment.stocks;
    
    if (!config.enabled) return opportunities;

    // Sector rotation signals
    config.sectors.forEach(sector => {
      const sectorData = data[sector] || {};
      
      if (sectorData.momentum && sectorData.momentum > 5) {
        opportunities.push({
          type: 'sector_momentum',
          sector,
          momentum: sectorData.momentum,
          signal: 'watch',
          confidence: 0.5 + (sectorData.momentum / 20),
          rationale: `${sector} showing momentum of ${sectorData.momentum}%`,
          urgency: 'low',
          potential_roi: sectorData.momentum * 2
        });
      }
    });

    return opportunities;
  }

  /**
   * Scan for business opportunities
   */
  async scanBusiness(data = {}) {
    const opportunities = [];
    const config = this.config.business;
    
    // Online business opportunities
    if (config.online.enabled) {
      config.online.opportunities.forEach(opp => {
        opportunities.push({
          type: 'online_business',
          subtype: opp,
          signal: 'research',
          confidence: 0.5,
          rationale: `Potential ${opp.replace(/_/g, ' ')} opportunity`,
          urgency: 'low',
          effort_required: 'medium',
          potential_roi: 50, // Percentage
          timeframe: '3-6 months'
        });
      });
    }

    // Arbitrage opportunities
    if (config.arbitrage.enabled) {
      config.arbitrage.types.forEach(type => {
        opportunities.push({
          type: 'arbitrage',
          subtype: type,
          signal: 'monitor',
          confidence: 0.4,
          rationale: `${type.replace(/_/g, ' ')} arbitrage potential`,
          urgency: 'low',
          effort_required: 'high',
          potential_roi: 5, // Low but consistent
          timeframe: 'ongoing'
        });
      });
    }

    return opportunities;
  }

  /**
   * Score all opportunities
   */
  scoreOpportunities(opportunities) {
    const weights = this.config.scoring;
    
    return opportunities.map(opp => {
      // Calculate sub-scores (0-1 scale)
      const roiScore = Math.min(opp.potential_roi / 100, 1);
      const riskScore = opp.signal === 'buy' ? 0.7 : 0.5; // Simple risk heuristic
      const effortScore = opp.effort_required === 'low' ? 1 : 
                         opp.effort_required === 'medium' ? 0.5 : 0.3;
      const timingScore = opp.urgency === 'high' ? 1 : 
                         opp.urgency === 'medium' ? 0.6 : 0.3;
      const alignmentScore = 0.7; // Default alignment

      // Weighted composite score
      const composite = (
        roiScore * weights.roi_weight +
        riskScore * weights.risk_weight +
        effortScore * weights.effort_weight +
        timingScore * weights.timing_weight +
        alignmentScore * weights.alignment_weight
      );

      return {
        ...opp,
        scores: {
          roi: roiScore,
          risk: riskScore,
          effort: effortScore,
          timing: timingScore,
          alignment: alignmentScore
        },
        composite_score: parseFloat(composite.toFixed(3)),
        grade: composite > 0.7 ? 'A' : composite > 0.5 ? 'B' : composite > 0.3 ? 'C' : 'D'
      };
    }).sort((a, b) => b.composite_score - a.composite_score);
  }

  /**
   * Full scan across all categories
   */
  async fullScan(data = {}) {
    console.log('🔍 Starting full opportunity scan...');
    
    const cryptoOpp = await this.scanCrypto(data.crypto || {});
    const stockOpp = await this.scanStocks(data.stocks || {});
    const businessOpp = await this.scanBusiness(data.business || {});
    
    const allOpportunities = [...cryptoOpp, ...stockOpp, ...businessOpp];
    const scored = this.scoreOpportunities(allOpportunities);
    
    const result = {
      timestamp: new Date().toISOString(),
      summary: {
        total: scored.length,
        by_grade: {
          A: scored.filter(o => o.grade === 'A').length,
          B: scored.filter(o => o.grade === 'B').length,
          C: scored.filter(o => o.grade === 'C').length,
          D: scored.filter(o => o.grade === 'D').length
        },
        top_opportunity: scored[0] || null
      },
      opportunities: scored
    };
    
    // Log results
    this.logScan(result);
    this.logToMemory(result);
    
    return result;
  }

  logScan(result) {
    const logFile = path.join(LOG_DIR, 'opportunity_scans.log');
    const entry = `[${result.timestamp}] Scan complete: ${result.summary.total} opportunities, ${result.summary.by_grade.A} grade A\n`;
    fs.appendFileSync(logFile, entry);
  }

  logToMemory(result) {
    const MEMORY_FILE = path.join(process.cwd(), 'MEMORY.md');
    const topOpp = result.summary.top_opportunity;
    
    const entry = `
## Opportunity Scanner - Full Scan
**Date:** ${result.timestamp}
**Total Opportunities:** ${result.summary.total}
**Grade Distribution:** ${JSON.stringify(result.summary.by_grade)}

**Top Opportunity:**
${topOpp ? `- Type: ${topOpp.type} (${topOpp.subtype || topOpp.asset || ''})
- Signal: ${topOpp.signal}
- Confidence: ${(topOpp.confidence * 100).toFixed(0)}%
- Composite Score: ${topOpp.composite_score} (${topOpp.grade})
- Rationale: ${topOpp.rationale}` : 'None found'}

---
`;

    try {
      if (fs.existsSync(MEMORY_FILE)) {
        fs.appendFileSync(MEMORY_FILE, entry);
      }
    } catch (e) {
      // Silent fail
    }
  }
}

module.exports = OpportunityScanner;

// CLI usage
if (require.main === module) {
  const scanner = new OpportunityScanner();
  
  // Example scan with mock data
  scanner.fullScan({
    crypto: {
      BTC: { change_24h: -12, volume_24h: 30000000, volume_change: 250 },
      ETH: { change_24h: -5, volume_24h: 15000000 }
    }
  }).then(result => {
    console.log('\n📊 Scan Results:');
    console.log(JSON.stringify(result.summary, null, 2));
    console.log('\n🏆 Top 3 Opportunities:');
    result.opportunities.slice(0, 3).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.type} - Score: ${opp.composite_score} (${opp.grade})`);
    });
  });
}
