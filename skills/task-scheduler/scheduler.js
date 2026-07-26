/**
 * Task Scheduler
 * Schedule and manage tasks without cron dependency
 */

const fs = require('fs');
const path = require('path');

const SCHEDULE_FILE = path.join(__dirname, '..', '..', 'memory', 'task_schedule.json');

class TaskScheduler {
  constructor() {
    this.tasks = this.loadTasks();
    this.running = false;
  }

  loadTasks() {
    if (fs.existsSync(SCHEDULE_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
    }
    return [];
  }

  saveTasks() {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(this.tasks, null, 2));
  }

  schedule({ name, intervalMinutes, action, data = {} }) {
    const task = {
      id: Date.now().toString(36),
      name,
      intervalMinutes,
      action,
      data,
      lastRun: null,
      nextRun: new Date(Date.now() + intervalMinutes * 60000).toISOString(),
      enabled: true,
      runCount: 0
    };
    
    this.tasks.push(task);
    this.saveTasks();
    
    return task;
  }

  checkScheduledTasks() {
    const now = new Date();
    const due = [];
    
    for (const task of this.tasks) {
      if (!task.enabled) continue;
      
      const nextRun = new Date(task.nextRun);
      if (now >= nextRun) {
        due.push(task);
      }
    }
    
    return due;
  }

  executeTask(task) {
    task.lastRun = new Date().toISOString();
    task.nextRun = new Date(Date.now() + task.intervalMinutes * 60000).toISOString();
    task.runCount++;
    
    this.saveTasks();
    
    return {
      executed: true,
      task: task.name,
      timestamp: task.lastRun
    };
  }

  disableTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.enabled = false;
      this.saveTasks();
    }
    return task;
  }

  removeTask(id) {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    return { removed: before - this.tasks.length };
  }

  getStats() {
    return {
      total: this.tasks.length,
      active: this.tasks.filter(t => t.enabled).length,
      dueNow: this.checkScheduledTasks().length
    };
  }
}

module.exports = TaskScheduler;
