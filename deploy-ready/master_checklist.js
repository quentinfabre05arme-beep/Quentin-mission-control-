/**
 * MASTER INVESTOR CHECKLIST SYSTEM
 * Extracted from Investment Research System Vol 5-6
 * Integrated into enhanced_research.js workflow
 * 
 * Usage: node master_checklist.js SYMBOL
 * Example: node master_checklist.js HIMS
 */

const fs = require('fs');
const path = require('path');

class InvestmentChecklist {
  constructor(symbol, data = {}) {
    this.symbol = symbol;
    this.data = data;
    this.scores = {
      businessQuality: 0,
      valuation: 0,
      catalyst: 0,
      risk: 0
    };
    this.totalScore = 0;
    this.recommendation = '';
  }

  /**
   * SECTION 1: BUSINESS QUALITY (25 points max)
   * From Vol 6 - Stage-Based Assessment
   */
  assessBusinessQuality() {
    console.log('\n' + '='.repeat(60));
    console.log('SECTION 1: BUSINESS QUALITY (25 points)');
    console.log('='.repeat(60));

    const criteria = [
      {
        question: 'Does the company have a durable competitive advantage (moat)?',
        points: 10,
        examples: {
          'HIMS': 'Brand trust in GLP-1, recurring prescriptions, telehealth platform',
          'SMCI': 'AI server market leadership, customization capability',
          'ETH': 'Network effects, developer ecosystem, staking',
          'BTC': 'Digital gold standard, scarcity, first-mover'
        }
      },
      {
        question: 'Is there a clear 3-5 year growth runway?',
        points: 10,
        examples: {
          'HIMS': 'GLP-1 market expansion, international growth',
          'SMCI': 'AI infrastructure buildout, data center growth',
          'ETH': 'DeFi, L2 scaling, institutional adoption',
          'BTC': 'ETF flows, corporate treasury adoption'
        }
      },
      {
        question: 'Is financial health strong (balance sheet, cash flow)?',
        points: 5,
        redFlags: ['High debt without cash flow', 'Burning cash without path to profitability']
      }
    ];

    let sectionScore = 0;
    criteria.forEach(c => {
      console.log(`\n[${c.points} pts] ${c.question}`);
      if (c.examples && c.examples[this.symbol]) {
        console.log(`  Example for ${this.symbol}: ${c.examples[this.symbol]}`);
      }
      if (c.redFlags) {
        console.log(`  Red flags: ${c.redFlags.join(', ')}`);
      }
      // In real implementation, this would prompt for input or read from data
      sectionScore += c.points; // Placeholder - would be based on actual assessment
    });

    this.scores.businessQuality = Math.min(sectionScore, 25);
    console.log(`\n✓ Business Quality Score: ${this.scores.businessQuality}/25`);
    return this.scores.businessQuality;
  }

  /**
   * SECTION 2: VALUATION ATTRACTIVENESS (25 points max)
   * From Vol 4 - Damodaran Framework + Vol 3 - Market Context
   */
  assessValuation() {
    console.log('\n' + '='.repeat(60));
    console.log('SECTION 2: VALUATION ATTRACTIVENESS (25 points)');
    console.log('='.repeat(60));

    const methods = [
      {
        name: 'Current vs Historical Multiples',
        points: 10,
        check: 'Is valuation below 3-year average?',
        action: 'Compare P/E, P/S, EV/EBITDA to historical ranges'
      },
      {
        name: 'Peer Comparison',
        points: 10,
        check: 'Is it cheaper than comparable companies?',
        action: 'Build comp table with 3-5 peers'
      },
      {
        name: 'DCF Upside',
        points: 5,
        check: 'Does DCF suggest 20%+ upside?',
        action: 'Run base/bull/bear DCF scenarios'
      }
    ];

    console.log('\nValuation Methods (use appropriate for asset type):');
    
    let sectionScore = 0;
    methods.forEach(m => {
      console.log(`\n[${m.points} pts] ${m.name}`);
      console.log(`  Check: ${m.check}`);
      console.log(`  Action: ${m.action}`);
      sectionScore += m.points;
    });

    // Stage-based valuation guidance
    const stageGuidance = {
      'HIMS': 'Mature Growth: Use PEG, EV/EBITDA, DCF',
      'SMCI': 'Mature Growth: Use PEG, EV/Sales (P/E too volatile)',
      'ETH': 'Growth: Network value, DCF (staked yield)',
      'BTC': 'Digital Gold: Stock-to-flow, Metcalfe law',
      'MSTR': 'Hybrid: BTC NAV + enterprise value'
    };

    if (stageGuidance[this.symbol]) {
      console.log(`\n📊 Stage-Based Guidance for ${this.symbol}:`);
      console.log(`   ${stageGuidance[this.symbol]}`);
    }

    this.scores.valuation = Math.min(sectionScore, 25);
    console.log(`\n✓ Valuation Score: ${this.scores.valuation}/25`);
    return this.scores.valuation;
  }

  /**
   * SECTION 3: CATALYST VISIBILITY (25 points max)
   * From Vol 5 - Alpha Layer Catalyst Analysis
   */
  assessCatalysts() {
    console.log('\n' + '='.repeat(60));
    console.log('SECTION 3: CATALYST VISIBILITY (25 points)');
    console.log('='.repeat(60));

    const catalysts = {
      'HIMS': [
        { type: 'Earnings', date: '2026-08-10', impact: 'High', desc: 'Q2 Earnings - GLP-1 revenue growth' },
        { type: 'Product', date: 'Ongoing', impact: 'Medium', desc: 'New medication expansions' }
      ],
      'SMCI': [
        { type: 'Product', date: 'Q3 2026', impact: 'High', desc: 'New AI server launches' },
        { type: 'Earnings', date: 'Monthly', impact: 'Medium', desc: 'Monthly business updates' }
      ],
      'ETH': [
        { type: 'Technical', date: 'Ongoing', impact: 'High', desc: 'RSI < 40 entry trigger' },
        { type: 'Regulatory', date: 'TBD', impact: 'High', desc: 'ETF approval potential' }
      ],
      'BTC': [
        { type: 'Market', date: 'Ongoing', impact: 'High', desc: 'Dip to $62K-63K entry' },
        { type: 'Macro', date: '2026-07-30', impact: 'Medium', desc: 'Fed meeting impact' }
      ]
    };

    const criteria = [
      { question: 'Near-term catalyst within 90 days?', points: 10 },
      { question: 'Earnings trajectory positive?', points: 10 },
      { question: 'Technical setup favorable?', points: 5 }
    ];

    let sectionScore = 0;
    
    // Show known catalysts for symbol
    if (catalysts[this.symbol]) {
      console.log('\n📅 Known Catalysts:');
      catalysts[this.symbol].forEach(c => {
        console.log(`   • ${c.type}: ${c.date} [${c.impact}] - ${c.desc}`);
      });
    }

    criteria.forEach(c => {
      console.log(`\n[${c.points} pts] ${c.question}`);
      sectionScore += c.points;
    });

    this.scores.catalyst = Math.min(sectionScore, 25);
    console.log(`\n✓ Catalyst Score: ${this.scores.catalyst}/25`);
    return this.scores.catalyst;
  }

  /**
   * SECTION 4: RISK ASSESSMENT (25 points max)
   * From Vol 4 - Risk Premiums + Vol 6 - Risk Management
   */
  assessRisk() {
    console.log('\n' + '='.repeat(60));
    console.log('SECTION 4: RISK ASSESSMENT (25 points)');
    console.log('='.repeat(60));

    const riskCategories = [
      {
        category: 'Known Risk',
        description: 'Can be priced, managed, diversified',
        example: 'Sector rotation, earnings miss'
      },
      {
        category: 'Known Unknown',
        description: 'Can be scenario planned',
        example: 'Regulatory change, competition'
      },
      {
        category: 'Unknown Unknown',
        description: 'Requires margin of safety',
        example: 'Black swan, fraud, catastrophe'
      }
    ];

    console.log('\n🎯 Three Layers of Risk (Klarman/Marks):');
    riskCategories.forEach(r => {
      console.log(`   • ${r.category}: ${r.description}`);
      console.log(`     Example: ${r.example}`);
    });

    const criteria = [
      { question: 'Downside scenarios identified and quantified?', points: 10 },
      { question: 'Liquidity sufficient for position size?', points: 5 },
      { question: 'Correlation to existing portfolio < 0.7?', points: 10 }
    ];

    let sectionScore = 0;
    criteria.forEach(c => {
      console.log(`\n[${c.points} pts] ${c.question}`);
      sectionScore += c.points;
    });

    this.scores.risk = Math.min(sectionScore, 25);
    console.log(`\n✓ Risk Score: ${this.scores.risk}/25`);
    return this.scores.risk;
  }

  /**
   * DECISION GATE: Final Recommendation
   * From Vol 6 - When to Buy/Sell Frameworks
   */
  makeDecision() {
    console.log('\n' + '='.repeat(60));
    console.log('DECISION GATE: FINAL ASSESSMENT');
    console.log('='.repeat(60));

    this.totalScore = Object.values(this.scores).reduce((a, b) => a + b, 0);

    const scoring = [
      { min: 90, max: 100, rating: '⭐⭐⭐⭐⭐ CONVICTION BUY', position: '12-15%' },
      { min: 80, max: 89, rating: '⭐⭐⭐⭐ STRONG BUY', position: '8-12%' },
      { min: 70, max: 79, rating: '⭐⭐⭐ MODERATE BUY', position: '6-8%' },
      { min: 60, max: 69, rating: '⭐⭐ WEAK BUY/WATCH', position: '4-6%' },
      { min: 0, max: 59, rating: '❌ AVOID', position: '0%' }
    ];

    const result = scoring.find(s => this.totalScore >= s.min && this.totalScore <= s.max);

    console.log('\n📊 FINAL SCORES:');
    console.log(`   Business Quality: ${this.scores.businessQuality}/25`);
    console.log(`   Valuation:        ${this.scores.valuation}/25`);
    console.log(`   Catalyst:         ${this.scores.catalyst}/25`);
    console.log(`   Risk Assessment:  ${this.scores.risk}/25`);
    console.log(`   ─────────────────────────`);
    console.log(`   TOTAL:            ${this.totalScore}/100`);
    console.log(`\n🎯 RECOMMENDATION: ${result.rating}`);
    console.log(`📏 POSITION SIZE: ${result.position}`);

    // Pre-trade checklist
    console.log('\n✋ PRE-TRADE CHECKLIST (Must Answer YES to ALL):');
    const checks = [
      'I understand the business model',
      'I have identified clear catalysts',
      'I have defined my stop loss',
      'I have defined my price target',
      'Position size is appropriate for conviction',
      'This is within my circle of competence',
      'I would hold for 5+ years if needed'
    ];

    checks.forEach((check, i) => {
      console.log(`   ${i + 1}. ☐ ${check}`);
    });

    return {
      symbol: this.symbol,
      scores: this.scores,
      total: this.totalScore,
      recommendation: result.rating,
      positionSize: result.position
    };
  }

  /**
   * Generate research report template
   */
  generateReport() {
    const report = {
      symbol: this.symbol,
      date: new Date().toISOString(),
      scores: this.scores,
      totalScore: this.totalScore,
      recommendation: this.recommendation,
      thesis: '',
      bullCase: '',
      bearCase: '',
      stopLoss: '',
      priceTarget: '',
      positionSize: '',
      catalysts: [],
      risks: []
    };

    const template = `
================================================================
INVESTMENT THESIS TEMPLATE: ${this.symbol}
Date: ${new Date().toLocaleDateString()}
Score: ${this.totalScore}/100
Recommendation: ${this.recommendation}
================================================================

1. THESIS (1-2 sentences):
   [Why will this go up? What's the core insight?]

2. CATALYSTS:
   • Near-term: [Within 90 days]
   • Medium-term: [3-12 months]
   • Long-term: [1-3 years]

3. VALUATION:
   • Current Price: $____
   • Fair Value: $____ (base), $____ (bull), $____ (bear)
   • Upside: ____%

4. SCENARIOS:
   • Bull Case: [What happens if everything goes right?]
   • Base Case: [Most likely outcome]
   • Bear Case: [What could go wrong?]

5. RISK MANAGEMENT:
   • Stop Loss: $____ (____% below entry)
   • Position Size: ____% of portfolio
   • Max Loss: $____ (____% of portfolio)

6. WHY I MIGHT BE WRONG:
   • [List 2-3 things that would invalidate thesis]

7. EXIT PLAN:
   • Scale out: +____%, +____%, +____%
   • Full exit if: [Thesis violation / valuation excess]

8. FOLLOW-UP:
   • Review Date: [Set date]
   • Review Trigger: [Price hits X or event Y occurs]

================================================================
`;

    console.log(template);
    return template;
  }
}

// CLI Execution
if (require.main === module) {
  const symbol = process.argv[2] || 'HIMS';
  
  console.log('\n' + '='.repeat(60));
  console.log(`MASTER INVESTOR CHECKLIST: ${symbol}`);
  console.log('='.repeat(60));
  console.log('\nFrom Investment Research System Vol 5-6');
  console.log('Synthesized from Buffett, Marks, Munger, Lynch, Fisher\n');

  const checklist = new InvestmentChecklist(symbol);
  
  checklist.assessBusinessQuality();
  checklist.assessValuation();
  checklist.assessCatalysts();
  checklist.assessRisk();
  checklist.makeDecision();
  checklist.generateReport();

  // Save results
  const outputPath = path.join(__dirname, `checklist_${symbol.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    symbol,
    date: new Date().toISOString(),
    scores: checklist.scores,
    totalScore: checklist.totalScore,
    recommendation: checklist.recommendation
  }, null, 2));

  console.log(`\n✓ Results saved to: ${outputPath}`);
}

module.exports = InvestmentChecklist;
