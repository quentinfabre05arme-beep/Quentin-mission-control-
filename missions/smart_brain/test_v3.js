const SmartRouterV3 = require('./router.v3');

console.log('🧪 Testing Claw Orchestration v3.0\n');

const router = new SmartRouterV3();

const testCases = [
    "What is the weather today?",
    "Write a Python function to calculate compound interest",
    "Analyze the best revenue strategy for an AI agent business in 2026",
    "How do I fix this bug in my JavaScript code?",
    "Calculate the probability of Bitcoin reaching $100k by end of 2026",
    "Explain quantum computing in simple terms"
];

testCases.forEach((task, i) => {
    console.log(`\nTest ${i + 1}: "${task}"`);
    const model = router.route(task);
    console.log(`→ Routed to: ${model.name} (${model.id})`);
});

console.log('\n📊 Stats:');
console.log(router.getStats());