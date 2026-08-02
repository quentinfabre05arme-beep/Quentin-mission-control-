/**
 * PROJECT CLAW CORE — Task Graph
 * Dependency-based task execution.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'task_graph.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class TaskGraph {
  constructor() {
    this.tasks = new Map();
  }
  
  addTask(id, fn, dependencies = []) {
    this.tasks.set(id, { id, fn, dependencies, status: 'pending', result: null, error: null });
  }
  
  async run() {
    log('Running task graph');
    const completed = new Set();
    const running = [];
    
    while (completed.size < this.tasks.size) {
      const ready = [];
      for (const [id, task] of this.tasks) {
        if (task.status === 'pending' && task.dependencies.every(d => completed.has(d))) {
          ready.push(task);
        }
      }
      
      if (ready.length === 0 && completed.size < this.tasks.size) {
        throw new Error('Dependency cycle or missing dependency detected');
      }
      
      for (const task of ready) {
        task.status = 'running';
        try {
          task.result = await task.fn();
          task.status = 'completed';
          completed.add(task.id);
        } catch(e) {
          task.status = 'failed';
          task.error = e.message;
          throw new Error(`Task ${task.id} failed: ${e.message}`);
        }
      }
    }
    
    const results = {};
    for (const [id, task] of this.tasks) {
      results[id] = { status: task.status, result: task.result, error: task.error };
    }
    return { success: true, results };
  }
}

module.exports = { TaskGraph };

if (require.main === module) {
  const graph = new TaskGraph();
  graph.addTask('a', async () => 'result A');
  graph.addTask('b', async () => 'result B', ['a']);
  graph.addTask('c', async () => 'result C', ['a']);
  graph.addTask('d', async () => 'result D', ['b', 'c']);
  graph.run().then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
