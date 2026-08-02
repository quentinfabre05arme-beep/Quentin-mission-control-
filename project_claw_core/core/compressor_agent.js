/**
 * PROJECT CLAW CORE — Compressor Agent
 * Zip/unzip files and directories.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'compressor_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function zip(sourcePath, outputZip) {
  log(`Zipping ${sourcePath} → ${outputZip}`);
  try {
    fs.mkdirSync(path.dirname(outputZip), { recursive: true });
    const absSource = path.resolve(sourcePath);
    const absOutput = path.resolve(outputZip);
    
    // Use PowerShell Compress-Archive
    const ps = `Compress-Archive -Path "${absSource}" -DestinationPath "${absOutput}" -Force`;
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 120000 });
    return { success: true, path: absOutput };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function unzip(zipPath, outputDir) {
  log(`Unzipping ${zipPath} → ${outputDir}`);
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const ps = `Expand-Archive -Path "${path.resolve(zipPath)}" -DestinationPath "${path.resolve(outputDir)}" -Force`;
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 120000 });
    return { success: true, path: path.resolve(outputDir) };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

class CompressorAgent {
  compress(source, output) {
    return zip(source, output);
  }
  
  decompress(archive, output) {
    return unzip(archive, output);
  }
}

module.exports = { CompressorAgent, zip, unzip };

if (require.main === module) {
  const agent = new CompressorAgent();
  const testDir = path.join(__dirname, '..', 'logs', 'compressor_test');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'test.txt'), 'hello');
  const zipFile = path.join(__dirname, '..', 'logs', 'compressor_test.zip');
  console.log(agent.compress(testDir, zipFile));
}
