/**
 * Revenue Monitoring Dashboard
 * Tracks all revenue streams, alerts on anomalies, generates reports
 * 
 * Usage: node monitoring_dashboard.js [--report] [--alert]
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  TRACKER_FILE: path.join(__dirname, 'revenue_tracker.json'),
  LOG_DIR: path.join(__dirname, 'logs'),
  STREAMS: ['pod', 'alpha_fund', 'newsletter', 'gumroad', 'x_premium', 'agency', 'saas'],
  TARGETS: {
    week_1: 500,
    week_2: 1000,
    week_3: 1500,
    week_4: 2500,
    month_2: 4000,
    month_3: 7000,
    month_6: 10300
  }
};

// Ensure log directory exists
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

// Load tracker
function loadTracker() {
  try {
    if (!fs.existsSync(CONFIG.TRACKER_FILE)) {
      return createBaselineTracker();
    }
    return JSON.parse(fs.readFileSync(CONFIG.TRACKER_FILE, 'utf8'));
  } catch (e) {
    console.error('Error loading tracker:', e.message);
    return createBaselineTracker();
  }
}

function createBaselineTracker() {
  return {
    baseline: {
      date: new Date().toISOString().split('T')[0],
      total_revenue: 0,
      streams: {
        pod: { revenue: 0, status: 'blocked', notes: 'API token expired' },
        alpha_fund: { revenue: 0, status: 'paper_trading', notes: 'Signals validated, no live capital' },
        newsletter: { revenue: 0, status: 'operational', notes: '1 subscriber, no paid tier' },
        gumroad: { revenue: 0, status: 'not_launched', notes: 'Products packaged, no store' },
        x_premium: { revenue: 0, status: 'pre_revenue', notes: '219 followers, content pipeline active' },
        agency: { revenue: 0, status: 'not_launched', notes: 'No clients yet' },
        saas: { revenue: 0, status: 'not_launched', notes: '80% built, needs auth/billing' }
      }
    },
    weekly_log: [],
    last_updated: new Date().toISOString()
  };
}

// Save tracker
function saveTracker(tracker) {
  tracker.last_updated = new Date().toISOString();
  fs.writeFileSync(CONFIG.TRACKER_FILE, JSON.stringify(tracker, null, 2));
}

// Generate health score for each stream
function calculateHealth(stream) {
  const scores = {
    operational: 100,
    paper_trading: 80,
    pre_revenue: 60,
    not_launched: 40,
    blocked: 20
  };
  return scores[stream.status] || 50;
}

// Generate dashboard report
function generateReport(tracker) {
  const now = new Date();
  const streams = tracker.baseline.streams;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 REVENUE MONITORING DASHBOARD');
  console.log(`📅 ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log('='.repeat(60));
  
  // Overall health
  const healthScores = Object.values(streams).map(calculateHealth);
  const avgHealth = Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length);
  
  console.log('\n🏥 OVERALL HEALTH');
  console.log(`   Score: ${avgHealth}/100 ${avgHealth >= 70 ? '🟢' : avgHealth >= 40 ? '🟡' : '🔴'}`);
  console.log(`   Total Revenue: €${tracker.baseline.total_revenue}`);
  
  // Stream breakdown
  console.log('\n📈 STREAM BREAKDOWN');
  console.log('-'.repeat(60));
  console.log('Stream          Status            Health  Revenue    Potential');
  console.log('-'.repeat(60));
  
  const streamOrder = ['pod', 'alpha_fund', 'newsletter', 'gumroad', 'x_premium', 'agency', 'saas'];
  const potentials = {
    pod: '€1,500-15,000/mo',
    alpha_fund: '€10,300/mo',
    newsletter: '€500-3,000/mo',
    gumroad: '€500-2,000/mo',
    x_premium: '€500-2,000/mo',
    agency: '€800-3,000/mo',
    saas: '€1,000-5,000/mo'
  };
  
  streamOrder.forEach(key => {
    const stream = streams[key];
    if (!stream) return;
    const health = calculateHealth(stream);
    const icon = health >= 70 ? '🟢' : health >= 40 ? '🟡' : '🔴';
    const name = key.toUpperCase().padEnd(15);
    const status = stream.status.padEnd(17);
    const rev = `€${stream.revenue}`.padEnd(8);
    console.log(`${icon} ${name} ${status} ${health}%    ${rev} ${potentials[key]}`);
  });
  
  // Targets
  console.log('\n🎯 TARGET TRACKING');
  console.log('-'.repeat(60));
  
  const currentRev = tracker.baseline.total_revenue;
  const startDate = new Date(tracker.baseline.date);
  const weeksElapsed = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000));
  
  Object.entries(CONFIG.TARGETS).forEach(([period, target]) => {
    const progress = currentRev >= target ? 100 : Math.round((currentRev / target) * 100);
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    const status = currentRev >= target ? '✅ HIT' : '📈 ON TRACK';
    console.log(`${period.padEnd(10)} [${bar}] ${progress}% | Target: €${target} | ${status}`);
  });
  
  // Action items
  console.log('\n⚡ IMMEDIATE ACTIONS');
  console.log('-'.repeat(60));
  
  const actions = [];
  if (streams.pod?.status === 'blocked') {
    actions.push('🔴 CRITICAL: Fix Printify API token → unblock €1,500-15,000/mo');
  }
  if (streams.gumroad?.status === 'not_launched') {
    actions.push('🟡 HIGH: Launch Gumroad store → €500-2,000/mo potential');
  }
  if (streams.newsletter?.status === 'operational' && tracker.baseline.streams.newsletter.revenue === 0) {
    actions.push('🟡 HIGH: Enable Substack paid tier → €500-3,000/mo potential');
  }
  if (streams.x_premium?.status === 'pre_revenue') {
    actions.push('🟢 MEDIUM: Ramp X posting → grow to 500+ followers for monetization');
  }
  
  if (actions.length === 0) {
    console.log('   ✅ All streams operational! Focus on scaling.');
  } else {
    actions.forEach((action, i) => console.log(`   ${i + 1}. ${action}`));
  }
  
  // Weekly trend
  if (tracker.weekly_log && tracker.weekly_log.length > 0) {
    console.log('\n📉 WEEKLY TREND');
    console.log('-'.repeat(60));
    tracker.weekly_log.slice(-4).forEach(week => {
      console.log(`   Week ${week.week}: €${week.revenue} ${week.revenue > 0 ? '↑' : '→'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`🕐 Last updated: ${tracker.last_updated}`);
  console.log('='.repeat(60) + '\n');
  
  return tracker;
}

// Alert check
function checkAlerts(tracker) {
  const alerts = [];
  const streams = tracker.baseline.streams;
  
  // Check blocked streams
  Object.entries(streams).forEach(([key, stream]) => {
    if (stream.status === 'blocked') {
      alerts.push({
        severity: 'CRITICAL',
        stream: key,
        message: `${key.toUpperCase()} is BLOCKED: ${stream.notes}`,
        action: 'Fix immediately to resume revenue'
      });
    }
  });
  
  // Check revenue gaps
  const now = new Date();
  const startDate = new Date(tracker.baseline.date);
  const weeksElapsed = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000));
  
  const weeklyTarget = CONFIG.TARGETS.week_1;
  const expectedRevenue = weeklyTarget * weeksElapsed;
  
  if (tracker.baseline.total_revenue < expectedRevenue * 0.5) {
    alerts.push({
      severity: 'WARNING',
      stream: 'overall',
      message: `Revenue €${tracker.baseline.total_revenue} vs expected €${expectedRevenue} (${weeksElapsed} weeks)`,
      action: 'Accelerate quick wins execution'
    });
  }
  
  if (alerts.length > 0) {
    console.log('\n🚨 ALERTS');
    console.log('='.repeat(60));
    alerts.forEach(alert => {
      const icon = alert.severity === 'CRITICAL' ? '🔴' : '🟡';
      console.log(`${icon} [${alert.severity}] ${alert.message}`);
      console.log(`   → Action: ${alert.action}`);
    });
    console.log('='.repeat(60) + '\n');
  }
  
  return alerts;
}

// Update stream status
function updateStreamStatus(tracker, streamName, status, revenue, notes) {
  if (!tracker.baseline.streams[streamName]) {
    tracker.baseline.streams[streamName] = { revenue: 0, status: 'unknown', notes: '' };
  }
  
  tracker.baseline.streams[streamName].status = status;
  if (revenue !== undefined) tracker.baseline.streams[streamName].revenue = revenue;
  if (notes) tracker.baseline.streams[streamName].notes = notes;
  
  // Recalculate total
  tracker.baseline.total_revenue = Object.values(tracker.baseline.streams)
    .reduce((sum, s) => sum + (s.revenue || 0), 0);
  
  return tracker;
}

// Log weekly snapshot
function logWeeklySnapshot(tracker) {
  const now = new Date();
  const weekNumber = Math.floor((now - new Date(tracker.baseline.date)) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  tracker.weekly_log = tracker.weekly_log || [];
  tracker.weekly_log.push({
    week: weekNumber,
    date: now.toISOString(),
    revenue: tracker.baseline.total_revenue,
    streams: JSON.parse(JSON.stringify(tracker.baseline.streams))
  });
  
  // Keep last 12 weeks
  if (tracker.weekly_log.length > 12) {
    tracker.weekly_log = tracker.weekly_log.slice(-12);
  }
  
  return tracker;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const doReport = args.includes('--report');
  const doAlert = args.includes('--alert');
  const doSnapshot = args.includes('--snapshot');
  
  let tracker = loadTracker();
  
  if (doSnapshot) {
    tracker = logWeeklySnapshot(tracker);
    saveTracker(tracker);
    console.log('📸 Weekly snapshot logged');
  }
  
  if (doReport || args.length === 0) {
    tracker = generateReport(tracker);
  }
  
  if (doAlert || args.length === 0) {
    const alerts = checkAlerts(tracker);
    if (alerts.length > 0) {
      // Log alerts to file
      const alertLog = path.join(CONFIG.LOG_DIR, `alerts_${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(alertLog, JSON.stringify(alerts, null, 2));
    }
  }
  
  saveTracker(tracker);
}

main();
