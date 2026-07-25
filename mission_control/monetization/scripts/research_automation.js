/**
 * OpenClaw Research Automation Engine
 * Automated market research, analysis, and report generation
 * Version 1.0 | July 25, 2026
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class ResearchAutomation {
  constructor(config = {}) {
    this.config = {
      dataDir: config.dataDir || './data',
      reportDir: config.reportDir || './reports',
      assets: config.assets || ['BTC', 'ETH', 'MSTR', 'HIMS'],
      intervals: config.intervals || {
        technical: 4 * 60 * 60 * 1000,
        sentiment: 12 * 60 * 60 * 1000,
        fundamental: 24 * 60 * 60 * 1000,
        comprehensive: 24 * 60 * 60 * 1000
      },
      ...config
    };

    this.isRunning = false;
    this.schedules = new Map();
    this.state = {
      lastTechnicalAnalysis: null,
      lastSentimentAnalysis: null,
      lastFundamentalAnalysis: null,
      lastComprehensiveReport: null,
      completedTasks: [],
      scheduledTasks: []
    };
    
    this.initialize();
  }

  async initialize() {
    console.log('[RESEARCH] Initializing research automation engine...');
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Load existing research state
    await this.loadState();
    
    console.log('[RESEARCH] Research automation ready');
  }

  async ensureDirectories() {
    const dirs = [
      this.config.dataDir,
      this.config.reportDir,
      path.join(this.config.reportDir, 'daily'),
      path.join(this.config.reportDir, 'weekly'),
      path.join(this.config.reportDir, 'alerts')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async loadState() {
    try {
      const statePath = path.join(this.config.dataDir, 'research_state.json');
      const data = await fs.readFile(statePath, 'utf8');
      const loaded = JSON.parse(data);
      this.state = { ...this.state, ...loaded };
    } catch {
      // Use default state already set
    }
  }

  async saveState() {
    const statePath = path.join(this.config.dataDir, 'research_state.json');
    await fs.writeFile(statePath, JSON.stringify(this.state, null, 2));
  }

  // Core Research Tasks
  async runTechnicalAnalysis(asset) {
    console.log(`[RESEARCH] Running technical analysis for ${asset}...`);
    
    try {
      // Use existing enhanced research system
      const scriptPath = path.join(process.cwd(), 'mission_control', 'enhanced_research.js');
      
      // Check if script exists
      try {
        await fs.access(scriptPath);
      } catch {
        console.log(`[RESEARCH] Enhanced research script not found, using fallback analysis`);
        return await this.fallbackTechnicalAnalysis(asset);
      }

      // Run the research script
      const { stdout, stderr } = await execAsync(`node "${scriptPath}" ${asset} --json`, {
        timeout: 60000,
        cwd: process.cwd()
      });

      if (stderr && !stderr.includes('ExperimentalWarning')) {
        console.warn(`[RESEARCH] Warning for ${asset}:`, stderr);
      }

      // Parse JSON output
      const lines = stdout.split('\n').filter(line => line.trim());
      const jsonLine = lines.find(line => line.startsWith('{'));
      
      if (jsonLine) {
        const result = JSON.parse(jsonLine);
        
        await this.saveAnalysis('technical', asset, result);
        
        console.log(`[RESEARCH] Technical analysis complete for ${asset}`);
        return result;
      }
      
      throw new Error('No JSON output found');
      
    } catch (error) {
      console.error(`[RESEARCH] Technical analysis failed for ${asset}:`, error.message);
      return await this.fallbackTechnicalAnalysis(asset);
    }
  }

  async fallbackTechnicalAnalysis(asset) {
    // Generate basic analysis when primary system is unavailable
    const now = new Date();
    
    return {
      asset,
      timestamp: now.toISOString(),
      type: 'technical',
      source: 'fallback',
      indicators: {
        rsi: { value: 50, signal: 'neutral' },
        macd: { value: 0, signal: 'neutral' },
        sma_20: { value: null, signal: 'neutral' }
      },
      recommendation: 'HOLD',
      confidence: 0.5,
      note: 'Fallback analysis - primary system unavailable'
    };
  }

  async runSentimentAnalysis(asset) {
    console.log(`[RESEARCH] Running sentiment analysis for ${asset}...`);
    
    try {
      // Use existing sentiment analysis system
      const scriptPath = path.join(process.cwd(), 'mission_control', 'enhanced_sentiment.js');
      
      try {
        await fs.access(scriptPath);
      } catch {
        return await this.fallbackSentimentAnalysis(asset);
      }

      const { stdout } = await execAsync(`node "${scriptPath}" ${asset} --json`, {
        timeout: 60000,
        cwd: process.cwd()
      });

      const lines = stdout.split('\n').filter(line => line.trim());
      const jsonLine = lines.find(line => line.startsWith('{'));
      
      if (jsonLine) {
        const result = JSON.parse(jsonLine);
        await this.saveAnalysis('sentiment', asset, result);
        return result;
      }
      
      throw new Error('No JSON output found');
      
    } catch (error) {
      console.error(`[RESEARCH] Sentiment analysis failed for ${asset}:`, error.message);
      return await this.fallbackSentimentAnalysis(asset);
    }
  }

  async fallbackSentimentAnalysis(asset) {
    return {
      asset,
      timestamp: new Date().toISOString(),
      type: 'sentiment',
      source: 'fallback',
      score: 0,
      label: 'neutral',
      sources_analyzed: 0,
      note: 'Fallback analysis - primary system unavailable'
    };
  }

  async runComprehensiveResearch(asset) {
    console.log(`[RESEARCH] Running comprehensive research for ${asset}...`);
    
    const [technical, sentiment] = await Promise.all([
      this.runTechnicalAnalysis(asset),
      this.runSentimentAnalysis(asset)
    ]);

    const comprehensive = {
      asset,
      timestamp: new Date().toISOString(),
      type: 'comprehensive',
      technical,
      sentiment,
      composite_score: this.calculateCompositeScore(technical, sentiment),
      recommendation: this.generateRecommendation(technical, sentiment),
      risk_level: this.assessRisk(technical, sentiment)
    };

    await this.saveAnalysis('comprehensive', asset, comprehensive);
    
    console.log(`[RESEARCH] Comprehensive research complete for ${asset}`);
    return comprehensive;
  }

  calculateCompositeScore(technical, sentiment) {
    // Weighted composite scoring
    const technicalScore = technical.recommendation === 'BUY' ? 1 : 
                          technical.recommendation === 'SELL' ? -1 : 0;
    const sentimentScore = sentiment.score / 100; // Normalize to -1 to 1
    
    return (technicalScore * 0.6) + (sentimentScore * 0.4);
  }

  generateRecommendation(technical, sentiment) {
    const score = this.calculateCompositeScore(technical, sentiment);
    
    if (score > 0.5) return 'STRONG_BUY';
    if (score > 0.2) return 'BUY';
    if (score < -0.5) return 'STRONG_SELL';
    if (score < -0.2) return 'SELL';
    return 'HOLD';
  }

  assessRisk(technical, sentiment) {
    // Simple risk assessment
    const volatility = Math.abs(technical.indicators?.rsi?.value - 50) || 0;
    
    if (volatility > 40) return 'high';
    if (volatility > 20) return 'medium';
    return 'low';
  }

  // Report Generation
  async generateDailyReport() {
    console.log('[RESEARCH] Generating daily comprehensive report...');
    
    const reports = [];
    
    for (const asset of this.config.assets) {
      const report = await this.runComprehensiveResearch(asset);
      reports.push(report);
    }

    const dailyReport = {
      timestamp: new Date().toISOString(),
      type: 'daily_comprehensive',
      assets: reports,
      market_summary: this.generateMarketSummary(reports),
      top_opportunities: this.identifyOpportunities(reports),
      risk_alerts: this.identifyRisks(reports)
    };

    // Save report
    const reportPath = path.join(
      this.config.reportDir,
      'daily',
      `report_${new Date().toISOString().split('T')[0]}.json`
    );
    
    await fs.writeFile(reportPath, JSON.stringify(dailyReport, null, 2));
    
    this.state.lastComprehensiveReport = new Date().toISOString();
    await this.saveState();
    
    console.log(`[RESEARCH] Daily report saved: ${reportPath}`);
    return dailyReport;
  }

  generateMarketSummary(reports) {
    const bullish = reports.filter(r => r.recommendation.includes('BUY')).length;
    const bearish = reports.filter(r => r.recommendation.includes('SELL')).length;
    const neutral = reports.length - bullish - bearish;

    return {
      sentiment: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
      bullish_count: bullish,
      bearish_count: bearish,
      neutral_count: neutral,
      average_score: reports.reduce((sum, r) => sum + r.composite_score, 0) / reports.length
    };
  }

  identifyOpportunities(reports) {
    return reports
      .filter(r => r.recommendation.includes('BUY') && r.risk_level !== 'high')
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, 3)
      .map(r => ({
        asset: r.asset,
        recommendation: r.recommendation,
        score: r.composite_score,
        risk: r.risk_level
      }));
  }

  identifyRisks(reports) {
    return reports
      .filter(r => r.risk_level === 'high' || r.recommendation.includes('SELL'))
      .map(r => ({
        asset: r.asset,
        risk: r.risk_level,
        recommendation: r.recommendation
      }));
  }

  // Storage
  async saveAnalysis(type, asset, data) {
    const dir = path.join(this.config.dataDir, 'analysis', type);
    await fs.mkdir(dir, { recursive: true });
    
    const filePath = path.join(dir, `${asset}_${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // Scheduling
  startScheduledResearch() {
    if (this.isRunning) {
      console.log('[RESEARCH] Research automation already running');
      return;
    }

    this.isRunning = true;
    console.log('[RESEARCH] Starting scheduled research automation...');

    // Schedule comprehensive research every 4 hours
    this.scheduleTask('comprehensive_research', this.config.intervals.technical, async () => {
      await this.generateDailyReport();
    });

    console.log('[RESEARCH] Schedules active:');
    for (const [name, schedule] of this.schedules) {
      console.log(`  - ${name}: every ${schedule.interval / 1000 / 60} minutes`);
    }
  }

  scheduleTask(name, interval, task) {
    const scheduleId = setInterval(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`[RESEARCH] Scheduled task ${name} failed:`, error.message);
      }
    }, interval);

    this.schedules.set(name, {
      id: scheduleId,
      interval,
      lastRun: null,
      nextRun: Date.now() + interval
    });
  }

  stopScheduledResearch() {
    this.isRunning = false;
    
    for (const [name, schedule] of this.schedules) {
      clearInterval(schedule.id);
      console.log(`[RESEARCH] Stopped schedule: ${name}`);
    }
    
    this.schedules.clear();
    console.log('[RESEARCH] All research schedules stopped');
  }

  // Status
  getStatus() {
    return {
      isRunning: this.isRunning,
      schedules: Array.from(this.schedules.entries()).map(([name, schedule]) => ({
        name,
        interval: schedule.interval,
        nextRun: schedule.nextRun
      })),
      lastComprehensiveReport: this.state.lastComprehensiveReport,
      assets: this.config.assets
    };
  }
}

module.exports = ResearchAutomation;

// Run if executed directly
if (require.main === module) {
  async function demo() {
    const research = new ResearchAutomation({
      dataDir: './mission_control/monetization/data',
      reportDir: './mission_control/monetization/reports'
    });

    // Generate a report
    console.log('\n=== Running Research Demo ===\n');
    
    const report = await research.generateDailyReport();
    
    console.log('\n=== Report Summary ===');
    console.log(`Market Sentiment: ${report.market_summary.sentiment}`);
    console.log(`Average Score: ${report.market_summary.average_score.toFixed(2)}`);
    console.log(`Opportunities: ${report.top_opportunities.length}`);
    console.log(`Risk Alerts: ${report.risk_alerts.length}`);

    // Start continuous operation
    console.log('\n=== Starting Continuous Research ===\n');
    research.startScheduledResearch();

    // Stop after 30 seconds for demo
    setTimeout(() => {
      research.stopScheduledResearch();
      console.log('\n=== Demo Complete ===');
      process.exit(0);
    }, 30000);
  }

  demo().catch(console.error);
}
