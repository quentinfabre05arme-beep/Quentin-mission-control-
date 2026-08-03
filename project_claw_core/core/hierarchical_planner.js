/**
 * HIERARCHICAL PLANNER v1.0
 * Breaks long-horizon goals into monthly → weekly → daily → cycle tasks.
 * Stores goal state and adapts schedule to system health.
 */

const fs = require('fs');
const path = require('path');

const GOALS_PATH = path.join(__dirname, '..', 'data', 'goal_state.json');
const PLANS_PATH = path.join(__dirname, '..', 'data', 'plans.json');

function loadGoals() {
  try {
    return JSON.parse(fs.readFileSync(GOALS_PATH, 'utf8'));
  } catch (e) {
    return { goals: [] };
  }
}

function saveGoals(state) {
  fs.mkdirSync(path.dirname(GOALS_PATH), { recursive: true });
  fs.writeFileSync(GOALS_PATH, JSON.stringify(state, null, 2));
}

function loadPlans() {
  try {
    return JSON.parse(fs.readFileSync(PLANS_PATH, 'utf8'));
  } catch (e) {
    return [];
  }
}

function savePlans(plans) {
  fs.mkdirSync(path.dirname(PLANS_PATH), { recursive: true });
  fs.writeFileSync(PLANS_PATH, JSON.stringify(plans, null, 2));
}

function addGoal(title, { priority = 1, deadline } = {}) {
  const state = loadGoals();
  const goal = {
    id: 'g_' + Date.now(),
    title,
    priority,
    deadline,
    progress: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  state.goals.push(goal);
  saveGoals(state);
  return goal;
}

function planWeek() {
  const state = loadGoals();
  const active = state.goals.filter(g => g.status === 'active').sort((a, b) => b.priority - a.priority);
  const weekly = active.slice(0, 3).map(g => {
    const title = g.title || 'Untitled goal';
    return {
      goalId: g.id,
      title,
      weekTasks: [
        { day: 'Mon', task: `Research ${title}` },
        { day: 'Tue', task: `Design ${title}` },
        { day: 'Wed', task: `Implement ${title}` },
        { day: 'Thu', task: `Verify ${title}` },
        { day: 'Fri', task: `Document ${title}` }
      ]
    };
  });
  savePlans(weekly);
  return weekly;
}

function pickNextTask(systemHealth = {}) {
  const plans = loadPlans();
  if (!plans.length) planWeek();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const candidates = [];
  for (const plan of plans) {
    const task = plan.weekTasks.find(t => t.day === today && !t.done);
    if (task) candidates.push({ ...task, goalId: plan.goalId, title: plan.title });
  }

  // Skip low-priority background work if system is under pressure
  if (systemHealth.ram > 90 || systemHealth.cpu > 90) {
    return { action: 'defer', reason: 'system under pressure', candidates };
  }
  return { action: 'execute', task: candidates[0] || null, candidates };
}

function markDone(goalId, day) {
  const plans = loadPlans();
  for (const plan of plans) {
    if (plan.goalId === goalId) {
      const task = plan.weekTasks.find(t => t.day === day);
      if (task) task.done = true;
    }
  }
  savePlans(plans);
}

module.exports = { addGoal, planWeek, pickNextTask, markDone, loadGoals, loadPlans };

if (require.main === module) {
  console.log(JSON.stringify(pickNextTask({ ram: 80, cpu: 40 }), null, 2));
}
