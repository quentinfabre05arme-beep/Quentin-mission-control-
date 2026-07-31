// Aggressive Scaling Tracker — Daily metrics dashboard

const fs = require('fs');
const path = require('path');

const TARGETS = {
  weekly: {
    podProducts: 10,      // Add 10 products/week
    xPosts: 35,           // 5 posts/day
    newsletterSubscribers: 25,
    alphaSignals: 7       // Daily signals
  },
  monthly: {
    revenue: 1000,        // Month 1 target
    totalProducts: 100,
    paidSubscribers: 10
  }
};

function loadMetrics() {
  try {
    return JSON.parse(fs.readFileSync('missions/aggressive_scaling/data/metrics.json', 'utf8'));
  } catch {
    return {
      startDate: '2026-07-24',
      currentWeek: 1,
      streams: {
        pod: { products: 35, sales: 0, revenue: 0 },
        x: { followers: 219, postsThisWeek: 0, engagement: 0 },
        newsletter: { subscribers: 0, openRate: 0, paid: 0 },
        alphaSignals: { signals: 0, accuracy: 0, subscribers: 0 }
      }
    };
  }
}

function generateDailyReport() {
  const metrics = loadMetrics();
  const today = new Date().toISOString().split('T')[0];
  
  const report = {
    date: today,
    week: metrics.currentWeek,
    targets: TARGETS.weekly,
    actual: {
      podProducts: metrics.streams.pod.products,
      xPosts: metrics.streams.x.postsThisWeek,
      newsletterSubs: metrics.streams.newsletter.subscribers,
      alphaSignals: metrics.streams.alphaSignals.signals
    },
    progress: {
      products: Math.round((metrics.streams.pod.products / 100) * 100),
      revenue: metrics.streams.pod.revenue
    },
    actions: []
  };

  // Check what's behind
  if (metrics.streams.x.postsThisWeek < TARGETS.weekly.xPosts) {
    report.actions.push('Increase X posting to 5/day');
  }
  if (metrics.streams.pod.products < 100) {
    report.actions.push(`Add ${100 - metrics.streams.pod.products} more POD products`);
  }

  return report;
}

function saveReport(report) {
  const logPath = 'missions/aggressive_scaling/logs/';
  fs.mkdirSync(logPath, { recursive: true });
  fs.writeFileSync(
    path.join(logPath, `${report.date}.json`),
    JSON.stringify(report, null, 2)
  );
}

// Run
const report = generateDailyReport();
saveReport(report);
console.log('Aggressive Scaling Report —', report.date);
console.log('Week:', report.week);
console.log('POD Products:', report.actual.podProducts, '/ 100 (', report.progress.products, '%)');
console.log('X Posts This Week:', report.actual.xPosts, '/', TARGETS.weekly.xPosts);
console.log('Actions:', report.actions.join(', ') || 'On track');
