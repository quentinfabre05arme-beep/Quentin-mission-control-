class Planner {
  constructor() {
    this.tasks = [];
  }

  plan(goal) {
    const plan = {
      goal,
      steps: [
        { id: 1, action: 'analyze', status: 'pending' },
        { id: 2, action: 'execute', status: 'pending' },
        { id: 3, action: 'verify', status: 'pending' }
      ],
      createdAt: new Date().toISOString()
    };
    this.tasks.push(plan);
    return plan;
  }
}

module.exports = { Planner };