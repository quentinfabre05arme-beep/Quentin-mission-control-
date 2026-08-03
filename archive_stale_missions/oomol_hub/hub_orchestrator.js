// OOMOL Hub Orchestrator - Central controller for all automation
const fs = require('fs');
const path = require('path');

class HubOrchestrator {
  constructor() {
    this.modules = {
      dashboard: require('./unified_dashboard'),
      reporting: require('./auto_reporting'),
      voice: require('./voice_commands')
    };
    
    this.logFile = path.join(__dirname, 'hub.log');
  }

  log(message) {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(this.logFile, line);
    console.log(message);
  }

  async initialize() {
    this.log('🚀 Initializing OOMOL Hub...');
    
    // Check all services
    const dashboard = new this.modules.dashboard();
    await dashboard.checkAllServices();
    
    // Verify workflows exist
    this.verifyWorkflows();
    
    this.log('✅ OOMOL Hub initialized');
    
    return {
      status: 'ready',
      services: Object.keys(this.modules),
      timestamp: new Date().toISOString()
    };
  }

  verifyWorkflows() {
    const workflowsDir = path.join(__dirname, '..', 'oomol_workflows');
    const required = [
      'daily_market_report.js',
      'weather_calendar_sync.js',
      'github_notion_sync.js',
      'research_pipeline.js',
      'file_librarian_drive.js',
      'oomol_llm_client.js',
      'ocr_pipeline.js',
      'semantic_search.js'
    ];
    
    const missing = [];
    for (const file of required) {
      if (!fs.existsSync(path.join(workflowsDir, file))) {
        missing.push(file);
      }
    }
    
    if (missing.length > 0) {
      this.log(`⚠️ Missing workflows: ${missing.join(', ')}`);
    } else {
      this.log('✅ All workflows verified');
    }
  }

  async runDailyCycle() {
    this.log('🔄 Starting daily automation cycle...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tasks: []
    };
    
    // 1. Market report
    try {
      this.log('📊 Running market report...');
      const reporter = new this.modules.reporting();
      await reporter.generateDailyReport();
      results.tasks.push({ name: 'market_report', status: 'success' });
    } catch (e) {
      results.tasks.push({ name: 'market_report', status: 'error', error: e.message });
    }
    
    // 2. Dashboard update
    try {
      this.log('📋 Updating dashboard...');
      const dashboard = new this.modules.dashboard();
      await dashboard.checkAllServices();
      results.tasks.push({ name: 'dashboard', status: 'success' });
    } catch (e) {
      results.tasks.push({ name: 'dashboard', status: 'error', error: e.message });
    }
    
    this.log('✅ Daily cycle complete');
    
    return results;
  }

  getStatus() {
    return {
      initialized: fs.existsSync(this.logFile),
      modules: Object.keys(this.modules),
      logFile: this.logFile,
      uptime: process.uptime()
    };
  }
}

if (require.main === module) {
  const hub = new HubOrchestrator();
  
  // Initialize
  hub.initialize().then(status => {
    console.log(JSON.stringify(status, null, 2));
    
    // Run daily cycle
    return hub.runDailyCycle();
  }).then(results => {
    console.log(JSON.stringify(results, null, 2));
  }).catch(console.error);
}

module.exports = HubOrchestrator;
