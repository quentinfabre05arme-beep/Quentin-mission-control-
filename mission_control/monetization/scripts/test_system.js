/**
 * OpenClaw Monetization System Test Suite
 * Validates all components are working correctly
 * Version 1.0 | July 25, 2026
 */

const fs = require('fs').promises;
const path = require('path');

class SystemTest {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     OPENCLAW MONETIZATION SYSTEM TEST SUITE                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    await this.testInfrastructure();
    await this.testOrchestrator();
    await this.testSubscriptionManager();
    await this.testResearchEngine();
    await this.testAPIServer();
    await this.testRevenueTracking();

    this.printSummary();
  }

  async test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
      this.results.push({ name, status: 'PASS' });
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      this.failed++;
      this.results.push({ name, status: 'FAIL', error: error.message });
    }
  }

  async testInfrastructure() {
    console.log('[TEST] Infrastructure');
    
    await this.test('Data directory exists', async () => {
      const dirs = [
        'data',
        'logs',
        'reports'
      ];
      
      for (const dir of dirs) {
        await fs.access(path.join(process.cwd(), dir));
      }
    });

    await this.test('Configuration file exists', async () => {
      await fs.access(path.join(process.cwd(), 'infrastructure', 'system_config.json'));
    });

    await this.test('Can write to data directory', async () => {
      const testFile = path.join(process.cwd(), 'data', 'test.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    });
  }

  async testOrchestrator() {
    console.log('\n[TEST] Revenue Orchestrator');
    
    const RevenueOrchestrator = require('./revenue_orchestrator');
    
    await this.test('Orchestrator initializes', async () => {
      const orch = new RevenueOrchestrator({
        dataDir: './mission_control/monetization/data',
        logDir: './mission_control/monetization/logs'
      });
      
      if (!orch) throw new Error('Failed to initialize');
    });

    await this.test('Returns system status', async () => {
      const orch = new RevenueOrchestrator({
        dataDir: './mission_control/monetization/data',
        logDir: './mission_control/monetization/logs'
      });
      
      const status = orch.getStatus();
      if (!status.status) throw new Error('Status not returned');
    });
  }

  async testSubscriptionManager() {
    console.log('\n[TEST] Subscription Manager');
    
    const SubscriptionManager = require('./subscription_manager');
    
    await this.test('Subscription manager initializes', async () => {
      const manager = new SubscriptionManager({
        dataDir: './mission_control/monetization/data'
      });
      
      if (!manager) throw new Error('Failed to initialize');
    });

    await this.test('Creates subscriber', async () => {
      const manager = new SubscriptionManager({
        dataDir: './mission_control/monetization/data'
      });
      
      const subscriber = await manager.createSubscriber({
        email: 'test@example.com',
        name: 'Test User'
      });
      
      if (!subscriber.id) throw new Error('No subscriber ID');
      
      // Cleanup
      const subsPath = path.join(process.cwd(), 'mission_control/monetization/data/subscribers.json');
      try {
        const data = await fs.readFile(subsPath, 'utf8');
        const subs = JSON.parse(data);
        const filtered = subs.filter(s => s.email !== 'test@example.com');
        await fs.writeFile(subsPath, JSON.stringify(filtered, null, 2));
      } catch {}
    });

    await this.test('Returns pricing tiers', async () => {
      const manager = new SubscriptionManager({
        dataDir: './mission_control/monetization/data'
      });
      
      const tiers = manager.getPricingTiers();
      if (!tiers.basic || !tiers.pro || !tiers.enterprise) {
        throw new Error('Missing pricing tiers');
      }
    });
  }

  async testResearchEngine() {
    console.log('\n[TEST] Research Automation');
    
    const ResearchAutomation = require('./research_automation');
    
    await this.test('Research engine initializes', async () => {
      const research = new ResearchAutomation({
        dataDir: './mission_control/monetization/data',
        reportDir: './mission_control/monetization/reports'
      });
      
      if (!research) throw new Error('Failed to initialize');
    });

    await this.test('Returns engine status', async () => {
      const research = new ResearchAutomation({
        dataDir: './mission_control/monetization/data',
        reportDir: './mission_control/monetization/reports'
      });
      
      const status = research.getStatus();
      if (!status.assets || status.assets.length === 0) {
        throw new Error('No assets tracked');
      }
    });
  }

  async testAPIServer() {
    console.log('\n[TEST] API Server');
    
    const RevenueAPIServer = require('./api_server');
    
    await this.test('API server initializes', async () => {
      const api = new RevenueAPIServer({
        port: 3456,
        dataDir: './mission_control/monetization/data'
      });
      
      if (!api) throw new Error('Failed to initialize');
    });
  }

  async testRevenueTracking() {
    console.log('\n[TEST] Revenue Tracking');
    
    await this.test('Can track revenue events', async () => {
      const event = {
        timestamp: new Date().toISOString(),
        stream_id: 'test',
        amount: 100,
        currency: 'USD'
      };
      
      const eventsPath = path.join(process.cwd(), 'mission_control/monetization/data/revenue_events.json');
      
      let events = [];
      try {
        const data = await fs.readFile(eventsPath, 'utf8');
        events = JSON.parse(data);
      } catch {}
      
      events.push(event);
      await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
      
      // Verify
      const verify = await fs.readFile(eventsPath, 'utf8');
      const parsed = JSON.parse(verify);
      if (parsed.length === 0) throw new Error('Event not saved');
      
      // Cleanup
      await fs.unlink(eventsPath);
    });
  }

  printSummary() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Tests: ${String(this.passed + this.failed).padEnd(45)}║`);
    console.log(`║  Passed: ${String(this.passed).padEnd(52)}║`);
    console.log(`║  Failed: ${String(this.failed).padEnd(52)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    
    if (this.failed === 0) {
      console.log('║  ✅ ALL TESTS PASSED - System ready for revenue generation ║');
    } else {
      console.log('║  ⚠️  SOME TESTS FAILED - Review errors above               ║');
    }
    
    console.log('╚════════════════════════════════════════════════════════════╝');
  }
}

// Run if executed directly
if (require.main === module) {
  const test = new SystemTest();
  test.runAllTests().catch(console.error);
}

module.exports = SystemTest;
