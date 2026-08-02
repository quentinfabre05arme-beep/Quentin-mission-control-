/**
 * PROJECT CLAW CORE — Agent Swarm
 * Coordinate multiple agents to complete a task.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'agent_swarm.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class AgentSwarm {
  constructor() {
    this.agents = [];
  }
  
  register(name, fn) {
    log(`Registering agent: ${name}`);
    this.agents.push({ name, fn });
  }
  
  async runTask(task, context) {
    log(`Swarm executing task: ${task}`);
    const results = [];
    for (const agent of this.agents) {
      try {
        const result = await agent.fn(task, context);
        results.push({ agent: agent.name, ...result });
      } catch(e) {
        results.push({ agent: agent.name, success: false, error: e.message });
      }
    }
    const best = results.filter(r => r.success).sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    return { success: true, results, best };
  }
}

module.exports = { AgentSwarm };

if (require.main === module) {
  const swarm = new AgentSwarm();
  swarm.register('health', () => ({ success: true, answer: 'system healthy', confidence: 0.9 }));
  swarm.register('market', () => ({ success: true, answer: 'BTC up 1%', confidence: 0.7 }));
  swarm.runTask('status', {}).then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
