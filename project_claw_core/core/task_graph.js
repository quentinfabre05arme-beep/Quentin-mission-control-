class TaskGraph {
  constructor() {
    this.tasks = new Map();
  }
  addTask(id, deps = []) {
    this.tasks.set(id, { id, deps, status: 'pending' });
  }
  complete(id) {
    const t = this.tasks.get(id); if (t) t.status = 'done'; }
  getReady() {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending' && t.deps.every(d => this.tasks.get(d)?.status === 'done'));
  }
}

module.exports = { TaskGraph };