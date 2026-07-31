const fs = require('fs');
const path = require('path');

class TaskFlow {
    constructor(options = {}) {
        this.queueFile = options.queueFile || path.join(__dirname, 'task_queue.json');
        this.queue = this.loadQueue();
        this.isRunning = false;
    }

    loadQueue() {
        try {
            if (fs.existsSync(this.queueFile)) {
                return JSON.parse(fs.readFileSync(this.queueFile, 'utf8'));
            }
        } catch (e) {}
        
        return {
            pending: [],
            running: [],
            completed: [],
            failed: []
        };
    }

    saveQueue() {
        fs.writeFileSync(this.queueFile, JSON.stringify(this.queue, null, 2));
    }

    addTask(task) {
        const newTask = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            ...task,
            status: 'pending',
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null
        };
        
        this.queue.pending.push(newTask);
        this.saveQueue();
        
        console.log(`[TaskFlow] Task added: ${newTask.id} - ${newTask.name}`);
        return newTask.id;
    }

    getNextTask() {
        if (this.queue.pending.length === 0) return null;
        
        // Sort by priority (higher first)
        this.queue.pending.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        const task = this.queue.pending.shift();
        task.status = 'running';
        task.startedAt = new Date().toISOString();
        
        this.queue.running.push(task);
        this.saveQueue();
        
        return task;
    }

    completeTask(taskId, result = null) {
        const index = this.queue.running.findIndex(t => t.id === taskId);
        if (index === -1) return false;
        
        const task = this.queue.running.splice(index, 1)[0];
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.result = result;
        
        this.queue.completed.push(task);
        this.saveQueue();
        
        console.log(`[TaskFlow] Task completed: ${taskId}`);
        return true;
    }

    failTask(taskId, error) {
        const index = this.queue.running.findIndex(t => t.id === taskId);
        if (index === -1) return false;
        
        const task = this.queue.running.splice(index, 1)[0];
        task.status = 'failed';
        task.completedAt = new Date().toISOString();
        task.error = error;
        
        this.queue.failed.push(task);
        this.saveQueue();
        
        console.log(`[TaskFlow] Task failed: ${taskId} - ${error}`);
        return true;
    }

    getStats() {
        return {
            pending: this.queue.pending.length,
            running: this.queue.running.length,
            completed: this.queue.completed.length,
            failed: this.queue.failed.length
        };
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log('[TaskFlow] TaskFlow engine started');
        
        setInterval(() => {
            if (this.queue.running.length === 0 && this.queue.pending.length > 0) {
                const task = this.getNextTask();
                if (task) {
                    console.log(`[TaskFlow] Executing: ${task.name}`);
                    // Task execution would be handled by the caller
                }
            }
        }, 5000);
    }
}

module.exports = TaskFlow;