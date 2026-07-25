/**
 * OpenClaw Revenue System Startup Script
 * Initializes and starts all revenue generation components
 * Version 1.0 | July 25, 2026
 */

const RevenueOrchestrator = require('./revenue_orchestrator');
const SubscriptionManager = require('./subscription_manager');
const ResearchAutomation = require('./research_automation');
const RevenueAPIServer = require('./api_server');

class RevenueSystemStartup {
  constructor() {
    this.components = new Map();
    this.status = 'initializing';
    this.startTime = Date.now();
  }

  async initialize() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     OpenClaw Revenue Generation System v1.0                ║');
    console.log('║     Autonomous Revenue Infrastructure                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    try {
      // Initialize data directories
      await this.ensureInfrastructure();

      // Start components in sequence
      await this.startOrchestrator();
      await this.startSubscriptionManager();
      await this.startResearchEngine();
      await this.startAPIServer();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start status reporting
      this.startStatusReporting();

      this.status = 'running';
      console.log();
      console.log('✅ Revenue System fully operational');
      console.log(`📊 Status: ${this.status}`);
      console.log(`⏱️  Uptime: ${this.formatUptime(Date.now() - this.startTime)}`);
      console.log();

    } catch (error) {
      this.status = 'failed';
      console.error('❌ Startup failed:', error.message);
      process.exit(1);
    }
  }

  async ensureInfrastructure() {
    console.log('[STARTUP] Ensuring infrastructure...');
    
    const fs = require('fs').promises;
    const path = require('path');
    
    const dirs = [
      './data',
      './data/revenue',
      './data/streams',
      './data/analysis',
      './logs',
      './logs/tasks',
      './logs/errors',
      './reports',
      './reports/daily',
      './reports/weekly',
      './reports/alerts'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(__dirname, '..', dir), { recursive: true });
    }

    console.log('  ✅ Infrastructure ready');
  }

  async startOrchestrator() {
    console.log('[STARTUP] Initializing Revenue Orchestrator...');
    
    const orchestrator = new RevenueOrchestrator({
      dataDir: './data',
      logDir: './logs'
    });

    this.components.set('orchestrator', orchestrator);
    console.log('  ✅ Orchestrator ready');
  }

  async startSubscriptionManager() {
    console.log('[STARTUP] Initializing Subscription Manager...');
    
    const manager = new SubscriptionManager({
      dataDir: './data'
    });

    this.components.set('subscriptions', manager);
    console.log('  ✅ Subscription Manager ready');
    console.log(`     📋 Pricing tiers: Basic ($29), Pro ($99), Enterprise ($499)`);
  }

  async startResearchEngine() {
    console.log('[STARTUP] Initializing Research Automation...');
    
    const research = new ResearchAutomation({
      dataDir: './data',
      reportDir: './reports',
      assets: ['BTC', 'ETH', 'MSTR', 'HIMS']
    });

    this.components.set('research', research);
    console.log('  ✅ Research Engine ready');
    console.log('     📊 Tracking: BTC, ETH, MSTR, HIMS');
  }

  async startAPIServer() {
    console.log('[STARTUP] Initializing API Server...');
    
    try {
      const api = new RevenueAPIServer({
        port: process.env.API_PORT || 3456,
        dataDir: './data'
      });

      await api.start();
      this.components.set('api', api);
      console.log('  ✅ API Server ready');
      console.log(`     🌐 Port: ${process.env.API_PORT || 3456}`);
    } catch (error) {
      console.log('  ⚠️  API Server failed to start (port may be in use)');
      console.log(`     Error: ${error.message}`);
      console.log('     Continuing without API server...');
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
      
      // Stop all components
      for (const [name, component] of this.components) {
        if (component.stop) {
          console.log(`  Stopping ${name}...`);
          await component.stop();
        }
      }

      console.log('✅ All components stopped');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[FATAL] Uncaught exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
    });
  }

  startStatusReporting() {
    setInterval(() => {
      const uptime = Date.now() - this.startTime;
      const orchestrator = this.components.get('orchestrator');
      
      if (orchestrator) {
        const status = orchestrator.getStatus();
        console.log(`[STATUS] Revenue: $${status.totalRevenue.toFixed(2)} | Streams: ${status.streams} | Uptime: ${this.formatUptime(uptime)}`);
      }
    }, 60000); // Every minute
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  getStatus() {
    return {
      status: this.status,
      uptime: Date.now() - this.startTime,
      components: Array.from(this.components.keys()),
      startTime: new Date(this.startTime).toISOString()
    };
  }
}

// Run if executed directly
if (require.main === module) {
  const startup = new RevenueSystemStartup();
  startup.initialize().catch(console.error);
}

module.exports = RevenueSystemStartup;
