/**
 * PROJECT CLAW CORE — AWS Agent
 * Basic AWS CLI wrapper.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'aws_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class AWSAgent {
  runCommand(cmd) {
    log(`AWS command: ${cmd}`);
    try {
      const output = execSync(`aws ${cmd}`, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
      return { success: true, output: output.trim() };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  listBuckets() {
    return this.runCommand('s3 ls');
  }
  
  configure(profile) {
    return { success: true, configured: !!profile, note: 'Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars or run aws configure' };
  }
}

module.exports = { AWSAgent };

if (require.main === module) {
  const aws = new AWSAgent();
  console.log(JSON.stringify(aws.listBuckets(), null, 2));
}
