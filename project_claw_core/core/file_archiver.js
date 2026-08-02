/**
 * PROJECT CLAW CORE — File Archiver
 * Archive files to zip/tar.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'file_archiver.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class FileArchiver {
  zip(inputPath, outputPath) {
    log(`Zipping ${inputPath} → ${outputPath}`);
    try {
      execSync(`powershell -c "Compress-Archive -Path '${inputPath}' -DestinationPath '${outputPath}' -Force"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 60000
      });
      return { success: fs.existsSync(outputPath), path: outputPath };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
  
  unzip(zipPath, outputDir) {
    log(`Unzipping ${zipPath} → ${outputDir}`);
    try {
      execSync(`powershell -c "Expand-Archive -Path '${zipPath}' -DestinationPath '${outputDir}' -Force"`, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 60000
      });
      return { success: true, dir: outputDir };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { FileArchiver };

if (require.main === module) {
  const archiver = new FileArchiver();
  const result = archiver.zip('project_claw_core/core/self_audit.js', 'project_claw_core/logs/test_archive.zip');
  console.log(JSON.stringify(result, null, 2));
}
