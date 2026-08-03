const { SelfAudit } = require('./project_claw_core/core/self_audit');
const audit = new SelfAudit();
const r = audit.run();
console.log(JSON.stringify(r.details.filter(d => !d.real).map(d => ({ path: d.path, stub_score: d.stub_score, lines: d.lines })), null, 2));
