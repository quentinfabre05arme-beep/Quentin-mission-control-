// Multi-Agent Team Orchestrator
// Routes tasks, manages agents, coordinates parallel execution

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const LOG_FILE = path.join(__dirname, 'team_log.txt');

// Agent definitions
const AGENTS = {
  research: {
    name: 'Research Agent',
    script: 'research_agent.js',
    schedule: 'every 4h',
    tasks: ['price_fetch', 'news_scan', 'ta_analysis'],
    priority: 'high'
  },
  system: {
    name: 'System Agent', 
    script: 'system_agent.js',
    schedule: 'every 2h',
    tasks: ['health_check', 'cleanup', 'optimize'],
    priority: 'critical'
  },
  content: {
    name: 'Content Agent',
    script: 'content_agent.js', 
    schedule: 'every 6h',
    tasks: ['generate_posts', 'schedule', 'engage'],
    priority: 'medium'
  },
  revenue: {
    name: 'Revenue Agent',
    script: 'revenue_agent.js',
    schedule: 'every 8h',
    tasks: ['track_sales', 'analytics', 'opportunities'],
    priority: 'medium'
  }
};

class AgentOrchestrator {
  constructor() {
    this.agents = AGENTS;
    this.state = this.loadState();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return { cycles: 0, agents: {}, lastRun: null };
    }
  }

  saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  log(message) {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(message);
  }

  // Run a single agent
  async runAgent(agentKey) {
    const agent = this.agents[agentKey];
    this.log(`Running ${agent.name}...`);
    
    const startTime = Date.now();
    try {
      // Dynamic import of agent module
      const agentModule = require(path.join(__dirname, agent.script));
      const result = await agentModule.run();
      
      this.state.agents[agentKey] = {
        lastRun: new Date().toISOString(),
        status: 'success',
        duration: Date.now() - startTime,
        tasks: result?.tasks || agent.tasks
      };
      
      this.log(`${agent.name} completed in ${Date.now() - startTime}ms`);
      return { success: true, agent: agentKey };
      
    } catch (error) {
      this.state.agents[agentKey] = {
        lastRun: new Date().toISOString(),
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message
      };
      
      this.log(`${agent.name} ERROR: ${error.message}`);
      return { success: false, agent: agentKey, error: error.message };
    }
  }

  // Run all agents in parallel
  async runAllAgents() {
    this.log('=== STARTING AGENT TEAM CYCLE ===');
    this.state.cycles++;
    
    const startTime = Date.now();
    
    // Run all agents concurrently
    const results = await Promise.allSettled(
      Object.keys(this.agents).map(key => this.runAgent(key))
    );
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.value?.success).length;
    const errorCount = results.length - successCount;
    
    this.log(`=== CYCLE ${this.state.cycles} COMPLETE ===`);
    this.log(`Duration: ${duration}ms | Success: ${successCount} | Errors: ${errorCount}`);
    
    this.state.lastRun = new Date().toISOString();
    this.saveState();
    
    return {
      cycle: this.state.cycles,
      duration,
      results: results.map(r => r.value || r.reason)
    };
  }

  // Get team status
  getStatus() {
    return {
      cycle: this.state.cycles,
      lastRun: this.state.lastRun,
      agents: Object.keys(this.agents).map(key => ({
        name: this.agents[key].name,
        ...this.state.agents[key],
        tasks: this.agents[key].tasks
      }))
    };
  }

  // Run specific agent by priority
  async runByPriority(priority) {
    const agentsToRun = Object.keys(this.agents).filter(
      key => this.agents[key].priority === priority
    );
    
    this.log(`Running ${priority} priority agents: ${agentsToRun.join(', ')}`);
    
    const results = await Promise.allSettled(
      agentsToRun.map(key => this.runAgent(key))
    );
    
    return results.map(r => r.value || r.reason);
  }
}

// CLI
if (require.main === module) {
  const orchestrator = new AgentOrchestrator();
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      orchestrator.runAllAgents().then(r => {
        console.log(JSON.stringify(r, null, 2));
      });
      break;
    case 'status':
      console.log(JSON.stringify(orchestrator.getStatus(), null, 2));
      break;
    case 'run-critical':
      orchestrator.runByPriority('critical').then(r => {
        console.log(JSON.stringify(r, null, 2));
      });
      break;
    default:
      console.log('Usage: node orchestrator.js {run|status|run-critical}');
  }
}

module.exports = AgentOrchestrator;
