// Multi-Agent Team Orchestrator v2
// Fixed: timeouts, process isolation, retries, error recovery

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = path.join(__dirname, 'team_state.json');
const LOG_FILE = path.join(__dirname, 'team_log.txt');
const AGENT_TIMEOUT = 45000; // 45 seconds max per agent
const MAX_RETRIES = 3;

const AGENTS = {
  research: {
    name: 'Research Agent',
    script: 'research_agent.js',
    schedule: 'every 4h',
    priority: 'high',
    timeout: 30000
  },
  system: {
    name: 'System Agent', 
    script: 'system_agent.js',
    schedule: 'every 2h',
    priority: 'critical',
    timeout: 20000
  },
  content: {
    name: 'Content Agent',
    script: 'content_agent.js', 
    schedule: 'every 6h',
    priority: 'medium',
    timeout: 25000
  },
  revenue: {
    name: 'Revenue Agent',
    script: 'revenue_agent.js',
    schedule: 'every 8h',
    priority: 'medium',
    timeout: 20000
  }
};

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class AgentOrchestratorV2 {
  constructor() {
    this.agents = AGENTS;
    this.state = this.loadState();
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return { cycles: 0, agents: {}, lastRun: null, errors: [] };
    }
  }

  saveState() {
    const tmpFile = STATE_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmpFile, STATE_FILE);
  }

  // Run agent as isolated process with timeout
  async runAgentProcess(agentKey) {
    const agent = this.agents[agentKey];
    const scriptPath = path.join(__dirname, agent.script);
    const timeout = agent.timeout || AGENT_TIMEOUT;
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [scriptPath], {
        cwd: __dirname,
        env: { ...process.env, AGENT_NAME: agentKey },
        timeout: timeout,
        killSignal: 'SIGTERM'
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Hard timeout
      const hardTimeout = setTimeout(() => {
        log(`FORCE KILLING ${agent.name} after ${timeout}ms`);
        child.kill('SIGKILL');
        reject(new Error(`TIMEOUT after ${timeout}ms`));
      }, timeout + 5000);
      
      child.on('close', (code) => {
        clearTimeout(hardTimeout);
        
        if (code === 0) {
          resolve({ 
            success: true, 
            output: stdout.slice(0, 1000),
            agent: agentKey 
          });
        } else {
          reject(new Error(`Exit code ${code}: ${stderr.slice(0, 500)}`));
        }
      });
      
      child.on('error', (err) => {
        clearTimeout(hardTimeout);
        reject(err);
      });
    });
  }

  // Run with retry logic
  async runWithRetry(agentKey) {
    const agent = this.agents[agentKey];
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log(`Running ${agent.name} (attempt ${attempt}/${MAX_RETRIES})...`);
        const startTime = Date.now();
        
        const result = await this.runAgentProcess(agentKey);
        const duration = Date.now() - startTime;
        
        this.state.agents[agentKey] = {
          lastRun: new Date().toISOString(),
          status: 'success',
          duration,
          attempt
        };
        
        log(`${agent.name} completed in ${duration}ms`);
        return result;
        
      } catch (error) {
        log(`${agent.name} attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === MAX_RETRIES) {
          this.state.agents[agentKey] = {
            lastRun: new Date().toISOString(),
            status: 'error',
            error: error.message,
            attempts: MAX_RETRIES
          };
          
          // Notify on critical agent failure
          if (agent.priority === 'critical') {
            await this.notifyCritical(`${agent.name} failed after ${MAX_RETRIES} attempts: ${error.message}`);
          }
          
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const backoff = 1000 * Math.pow(2, attempt - 1);
        log(`Retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }

  // Pre-flight health check
  async preFlightCheck() {
    try {
      const memInfo = this.checkMemory();
      if (memInfo.percentUsed > 90) {
        return { ok: false, reason: `Memory critical: ${memInfo.percentUsed}%` };
      }
      
      // Check if another cycle is already running
      if (this.state.lastRun) {
        const lastRun = new Date(this.state.lastRun);
        const elapsed = Date.now() - lastRun.getTime();
        if (elapsed < 60000) { // Less than 1 minute ago
          return { ok: false, reason: 'Another cycle started recently' };
        }
      }
      
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: `Pre-flight error: ${e.message}` };
    }
  }

  checkMemory() {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      return {
        total,
        free,
        used: total - free,
        percentUsed: Math.round(((total - free) / total) * 100)
      };
    } catch (e) {
      return { percentUsed: 0, error: e.message };
    }
  }

  async notifyCritical(message) {
    log(`🚨 CRITICAL: ${message}`);
    // Could add Telegram notification here
  }

  // Run all agents with proper isolation
  async runAllAgents() {
    const preFlight = await this.preFlightCheck();
    if (!preFlight.ok) {
      log(`⏭️ Skipping cycle: ${preFlight.reason}`);
      return { skipped: true, reason: preFlight.reason };
    }

    this.state.cycles++;
    log(`\n=== STARTING AGENT TEAM CYCLE ${this.state.cycles} ===`);
    
    const startTime = Date.now();
    const results = [];
    
    // Run agents by priority: critical first, then high, then medium
    const priorityOrder = ['critical', 'high', 'medium'];
    
    for (const priority of priorityOrder) {
      const agentsAtPriority = Object.keys(this.agents).filter(
        key => this.agents[key].priority === priority
      );
      
      if (agentsAtPriority.length === 0) continue;
      
      log(`Running ${priority} priority agents: ${agentsAtPriority.join(', ')}`);
      
      // Run agents at this priority in parallel
      const priorityResults = await Promise.allSettled(
        agentsAtPriority.map(key => this.runWithRetry(key))
      );
      
      results.push(...priorityResults);
      
      // If critical agent fails, stop early
      if (priority === 'critical') {
        const criticalFailures = priorityResults.filter(
          r => r.status === 'rejected'
        );
        if (criticalFailures.length > 0) {
          log(`Critical agent failed, stopping cycle`);
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.length - successCount;

    log(`\n=== CYCLE ${this.state.cycles} COMPLETE ===`);
    log(`Duration: ${duration}ms | Success: ${successCount} | Errors: ${errorCount}`);

    this.state.lastRun = new Date().toISOString();
    this.saveState();

    return {
      cycle: this.state.cycles,
      duration,
      success: successCount,
      errors: errorCount,
      results: results.map(r => ({
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : undefined,
        reason: r.status === 'rejected' ? r.reason.message : undefined
      }))
    };
  }

  getStatus() {
    return {
      cycle: this.state.cycles,
      lastRun: this.state.lastRun,
      agents: Object.keys(this.agents).map(key => ({
        name: this.agents[key].name,
        priority: this.agents[key].priority,
        ...this.state.agents[key]
      }))
    };
  }
}

// CLI
if (require.main === module) {
  const orchestrator = new AgentOrchestratorV2();
  const command = process.argv[2];

  switch (command) {
    case 'run':
      orchestrator.runAllAgents().then(r => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(0);
      }).catch(err => {
        console.error('Fatal error:', err.message);
        process.exit(1);
      });
      break;
    case 'status':
      console.log(JSON.stringify(orchestrator.getStatus(), null, 2));
      process.exit(0);
      break;
    default:
      console.log('Usage: node orchestrator_v2.js {run|status}');
      process.exit(0);
  }
}

module.exports = AgentOrchestratorV2;
