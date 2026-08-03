// Health Monitor — one-shot check for Task Scheduler (exit after report)
// Paths aligned with 2026-07-31 mission audit (archived systems not required)
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'missions', 'health_reports');

const SYSTEMS = [
  {
    name: 'OpenClaw Gateway',
    check: () => checkGatewayPort(18789)
  },
  {
    name: 'Newsletter',
    check: () => fs.existsSync(path.join(ROOT, 'content_pipeline/newsletter/newsletter_generator.js'))
  },
  {
    name: 'X Posting',
    check: () =>
      fs.existsSync(path.join(ROOT, 'x_autonomous.js')) ||
      fs.existsSync(path.join(ROOT, 'content_pipeline/x_autonomous.js')) ||
      fs.existsSync(path.join(ROOT, 'x_free_poster.js')) ||
      fs.existsSync(path.join(ROOT, 'x_post_browser.js'))
  },
  {
    name: 'POD Business',
    check: () =>
      fs.existsSync(path.join(ROOT, 'pod_business/daily_monitor.js')) ||
      fs.existsSync(path.join(ROOT, 'pod_business'))
  },
  {
    name: 'Market Data',
    check: () => {
      const p = path.join(ROOT, 'mission_control/market_data.json');
      if (!fs.existsSync(p)) return false;
      try {
        const md = JSON.parse(fs.readFileSync(p, 'utf8'));
        const ageMin = (Date.now() - new Date(md.timestamp).getTime()) / 60000;
        return Number.isFinite(ageMin) && ageMin < 120;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'System Monitor Mission',
    check: () =>
      fs.existsSync(path.join(ROOT, 'missions/system_monitor')) ||
      fs.existsSync(path.join(ROOT, 'recovery/auto_restart.ps1'))
  }
];

function checkGatewayPort(port) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"`,
      { encoding: 'utf8', timeout: 8000 }
    );
    return parseInt(String(out).trim(), 10) > 0;
  } catch {
    return false;
  }
}

function ensureReportDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

async function healthCheck() {
  ensureReportDir();
  const report = {
    timestamp: new Date().toISOString(),
    systems: [],
    failed: []
  };

  for (const system of SYSTEMS) {
    let healthy = false;
    try {
      healthy = !!system.check();
    } catch (e) {
      healthy = false;
    }
    report.systems.push({ name: system.name, status: healthy ? 'healthy' : 'failed' });
    if (!healthy) {
      report.failed.push(system.name);
      console.log(`ALERT: ${system.name} is DOWN`);
      await attemptRecovery(system.name);
    } else {
      console.log(`OK: ${system.name}`);
    }
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), JSON.stringify(report, null, 2));
  return report;
}

async function attemptRecovery(systemName) {
  console.log(`Attempting recovery for ${systemName}...`);
  ensureReportDir();
  fs.appendFileSync(
    path.join(REPORT_DIR, 'recovery_log.txt'),
    `${new Date().toISOString()}: Recovery attempted for ${systemName}\n`
  );

  if (systemName === 'OpenClaw Gateway') {
    try {
      execSync('openclaw gateway status', { encoding: 'utf8', timeout: 15000 });
    } catch (e) {
      console.log('Gateway status check failed during recovery attempt');
    }
  }
}

healthCheck()
  .then((report) => {
    const code = report.failed.length > 0 ? 1 : 0;
    console.log(`Health monitor done — failed=${report.failed.length}`);
    process.exit(code);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
