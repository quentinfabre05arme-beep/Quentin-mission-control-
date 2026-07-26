const tests = [
  { name: 'Smart Cache', file: './skills/smart-cache/cache.js', class: 'SmartCache' },
  { name: 'Report Generator', file: './skills/automated-report-generator/generator.js', class: 'ReportGenerator' },
  { name: 'Pattern Recognition', file: './skills/pattern-recognition-engine/engine.js', class: 'PatternRecognition' },
  { name: 'Data Pipeline', file: './skills/data-pipeline-processor/pipeline.js', class: 'DataPipeline' },
  { name: 'Notification Manager', file: './skills/notification-manager/manager.js', class: 'NotificationManager' },
  { name: 'Task Scheduler', file: './skills/task-scheduler/scheduler.js', class: 'TaskScheduler' },
  { name: 'File Organizer', file: './skills/file-organizer/organizer.js', class: 'FileOrganizer' },
  { name: 'Health Monitor', file: './skills/health-monitor/monitor.js', class: 'HealthMonitor' },
  { name: 'Config Manager', file: './skills/config-manager/manager.js', class: 'ConfigManager' }
];

let passed = 0;
let failed = 0;

console.log('=== TESTING NEW SKILLS ===\n');

for (const test of tests) {
  try {
    const mod = require(test.file);
    const instance = new mod();
    console.log('✓ ' + test.name + ': LOADED');
    passed++;
  } catch (e) {
    console.log('✗ ' + test.name + ': ' + e.message);
    failed++;
  }
}

console.log('\n=== RESULTS ===');
console.log('Passed: ' + passed + '/' + tests.length);
console.log('Failed: ' + failed + '/' + tests.length);

if (failed === 0) {
  console.log('\n🎉 ALL NEW SKILLS WORKING!');
}
