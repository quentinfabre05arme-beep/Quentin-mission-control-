// Revenue Team — Daily Orchestrator
// Runs all 4 agents, synthesizes output, delivers to Claw

const MarketScout = require('./market_scout');
const PerformanceAnalyst = require('./performance_analyst');
const PricingStrategist = require('./pricing_strategist');
const InnovationLab = require('./innovation_lab');

const fs = require('fs').promises;
const path = require('path');

class TeamOrchestrator {
  constructor() {
    this.agents = {
      market_scout: new MarketScout(),
      performance_analyst: new PerformanceAnalyst(),
      pricing_strategist: new PricingStrategist(),
      innovation_lab: new InnovationLab()
    };
    this.outputDir = path.join(__dirname, 'daily_reports');
  }

  async initialize() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async runDailyStandup() {
    console.log('🚀 Revenue Team Daily Standup — 06:30 CET\n');
    
    const reports = {};
    
    // Run all agents in parallel
    console.log('Running agents...');
    const [scout, analyst, strategist, lab] = await Promise.all([
      this.agents.market_scout.generateReport(),
      this.agents.performance_analyst.generateReport(),
      this.agents.pricing_strategist.generateReport(),
      this.agents.innovation_lab.generateReport()
    ]);

    reports.market_scout = scout;
    reports.performance_analyst = analyst;
    reports.pricing_strategist = strategist;
    reports.innovation_lab = lab;

    // Synthesize recommendations
    const consolidated = this.synthesizeRecommendations(reports);
    
    // Save consolidated report
    await this.saveConsolidatedReport(consolidated);
    
    return consolidated;
  }

  synthesizeRecommendations(reports) {
    const allRecommendations = [];

    // Market Scout opportunities
    reports.market_scout.top_opportunities.forEach(opp => {
      allRecommendations.push({
        source: 'market_scout',
        priority: opp.score > 0.8 ? 1 : opp.score > 0.6 ? 2 : 3,
        type: 'new_opportunity',
        title: opp.recommendation,
        description: `Discovered via ${opp.source}. Market size: ${opp.estimated_market}`,
        confidence: opp.score,
        effort: opp.effort_to_launch,
        expected_impact: opp.estimated_market,
        auto_implement: opp.effort_to_launch === 'low' && opp.score > 0.75
      });
    });

    // Performance Analyst optimizations
    reports.performance_analyst.recommendations.forEach(rec => {
      allRecommendations.push({
        source: 'performance_analyst',
        priority: rec.severity === 'critical' ? 1 : 2,
        type: 'optimization',
        title: rec.action,
        description: rec.rationale,
        confidence: 0.7,
        effort: rec.effort,
        expected_impact: rec.expected_lift,
        auto_implement: rec.effort === 'low'
      });
    });

    // Pricing Strategist opportunities
    reports.pricing_strategist.top_recommendations.forEach(rec => {
      allRecommendations.push({
        source: 'pricing_strategist',
        priority: rec.confidence > 0.8 ? 1 : 2,
        type: 'pricing',
        title: `${rec.type}: ${rec.stream}`,
        description: rec.rationale,
        confidence: rec.confidence,
        effort: 'low',
        expected_impact: rec.expected_impact?.percent_change || 'unknown',
        auto_implement: rec.confidence > 0.75
      });
    });

    // Innovation Lab ideas
    reports.innovation_lab.top_priorities.forEach(idea => {
      allRecommendations.push({
        source: 'innovation_lab',
        priority: idea.priority,
        type: 'new_stream',
        title: idea.name,
        description: idea.description,
        confidence: idea.confidence,
        effort: idea.effort,
        expected_impact: idea.market_size,
        auto_implement: idea.action?.type === 'implement_immediately',
        next_action: idea.action
      });
    });

    // Sort by priority and confidence
    const sorted = allRecommendations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });

    return {
      date: new Date().toISOString(),
      total_recommendations: sorted.length,
      auto_implement_count: sorted.filter(r => r.auto_implement).length,
      top_recommendations: sorted.slice(0, 5),
      deferred: sorted.filter(r => !r.auto_implement).slice(5),
      summary: `${sorted.length} recommendations. ${sorted.filter(r => r.auto_implement).length} ready for auto-implementation.`
    };
  }

  async saveConsolidatedReport(report) {
    const filename = path.join(
      this.outputDir,
      `consolidated_${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    
    // Also save as markdown for human review
    const mdFilename = path.join(
      this.outputDir,
      `consolidated_${new Date().toISOString().split('T')[0]}.md`
    );
    await fs.writeFile(mdFilename, this.formatMarkdown(report));
  }

  formatMarkdown(report) {
    let md = `# Revenue Team Daily Report — ${new Date().toISOString().split('T')[0]}\n\n`;
    md += `## Summary\n\n`;
    md += `${report.summary}\n\n`;
    
    md += `## Top 5 Recommendations\n\n`;
    report.top_recommendations.forEach((rec, i) => {
      md += `### ${i + 1}. ${rec.title}\n`;
      md += `- **Source:** ${rec.source}\n`;
      md += `- **Type:** ${rec.type}\n`;
      md += `- **Priority:** ${rec.priority}\n`;
      md += `- **Confidence:** ${(rec.confidence * 100).toFixed(0)}%\n`;
      md += `- **Effort:** ${rec.effort}\n`;
      md += `- **Expected Impact:** ${rec.expected_impact}\n`;
      md += `- **Auto-Implement:** ${rec.auto_implement ? '✅ Yes' : '⏳ Manual review'}\n`;
      md += `- **Description:** ${rec.description}\n\n`;
    });

    if (report.deferred.length > 0) {
      md += `## Deferred (${report.deferred.length})\n\n`;
      report.deferred.slice(0, 5).forEach(rec => {
        md += `- ${rec.title} (${rec.source})\n`;
      });
    }

    return md;
  }
}

module.exports = TeamOrchestrator;

// Run if called directly
if (require.main === module) {
  const orchestrator = new TeamOrchestrator();
  orchestrator.initialize().then(() => {
    return orchestrator.runDailyStandup();
  }).then(report => {
    console.log('\n📊 Consolidated Report:');
    console.log(JSON.stringify(report, null, 2));
  });
}
