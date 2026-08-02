/**
 * PROJECT CLAW CORE — Deploy Agent
 * Deploy files/directories to target locations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'deploy_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

class DeployAgent {
  deployFiles(files, targetDir) {
    log(`Deploying ${files.length} files to ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
    const deployed = [];
    for (const file of files) {
      const dest = path.join(targetDir, path.basename(file));
      try {
        fs.copyFileSync(file, dest);
        deployed.push({ src: file, dest });
      } catch(e) {
        log(`Failed to deploy ${file}: ${e.message}`);
      }
    }
    return { success: true, deployed, count: deployed.length };
  }
  
  deployDirectory(sourceDir, targetDir) {
    log(`Deploying directory ${sourceDir} → ${targetDir}`);
    try {
      copyRecursive(sourceDir, targetDir);
      return { success: true, source: sourceDir, target: targetDir };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  syncWithGit(repoPath, remote = 'origin', branch = 'master') {
    log(`Git sync: ${repoPath} → ${remote}/${branch}`);
    try {
      execSync('git add .', { cwd: repoPath, windowsHide: true });
      execSync(`git commit -m "Auto deploy commit"`, { cwd: repoPath, windowsHide: true });
      execSync(`git push ${remote} ${branch}`, { cwd: repoPath, windowsHide: true });
      return { success: true };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { DeployAgent };

if (require.main === module) {
  const agent = new DeployAgent();
  const result = agent.deployFiles([
    'project_claw_core/dashboard/health.html'
  ], 'project_claw_core/deployed');
  console.log(JSON.stringify(result, null, 2));
}
