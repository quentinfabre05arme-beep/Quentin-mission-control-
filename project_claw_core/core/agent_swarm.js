const { execSync } = require('child_process');

class AgentSwarm {
  constructor() {
    this.agents = [];
  }
  addAgent(name, command) {
    this.agents.push({ name, command });
  }
  runAll() {
    return this.agents.map(a => {
      try {
        const result = execSync(a.command, { encoding: 'utf8', windowsHide: true, timeout: 60000 });
        return { name: a.name, success: true, output: result };
      } catch(e) {
        return { name: a.name, success: false, error: e.message };
      }
    });
  }
}

module.exports = { AgentSwarm };