/**
 * PROJECT CLAW CORE — Docker Agent
 * Basic Docker CLI wrapper.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'docker_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class DockerAgent {
  runCommand(cmd) {
    log(`Docker command: ${cmd}`);
    try {
      const output = execSync(`docker ${cmd}`, { encoding: 'utf8', windowsHide: true, timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  listContainers() {
    return this.runCommand('ps -a --format "table {{.ID}}\\t{{.Names}}\\t{{.Status}}"');
  }
  
  listImages() {
    return this.runCommand('images --format "{{.Repository}}:{{.Tag}}"');
  }
}

module.exports = { DockerAgent };

if (require.main === module) {
  const docker = new DockerAgent();
  console.log(JSON.stringify(docker.listContainers(), null, 2));
}
