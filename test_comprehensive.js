const https = require('https');
const net = require('net');
const { getSecret } = require('./lib/secret_resolver');

let passed = 0;
let failed = 0;
let testsCompleted = 0;
const totalTests = 8;

function checkComplete() {
  testsCompleted++;
  if (testsCompleted === totalTests) {
    console.log('\n=== TEST SUMMARY ===');
    console.log('Passed:', passed);
    console.log('Failed:', failed);
    console.log('Total:', passed + failed);
    console.log('Success Rate:', ((passed/(passed+failed))*100).toFixed(0) + '%');
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
    }
  }
}

console.log('=== FINAL COMPREHENSIVE TEST ===\n');

// Test 1: Web Search
console.log('1. Web Search...');
try {
  const API_KEY = getSecret('serper-api');
  const options = {
    hostname: 'google.serper.dev',
    path: '/search',
    method: 'POST',
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      const result = JSON.parse(data);
      if (result.organic?.length > 0) {
        console.log('   ✅ PASS');
        passed++;
      } else {
        console.log('   ❌ FAIL: No results');
        failed++;
      }
      checkComplete();
    });
  });
  
  req.on('error', (e) => {
    console.log('   ❌ FAIL:', e.message);
    failed++;
    checkComplete();
  });
  req.write(JSON.stringify({ q: 'test', num: 1 }));
  req.end();
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
  checkComplete();
}

// Test 2: Multi-Agent
console.log('2. Multi-Agent Orchestrator...');
try {
  const { MultiAgentOrchestrator } = require('./skills/multi-agent-orchestrator/orchestrator');
  const orch = new MultiAgentOrchestrator();
  const team = orch.createTeam('Research BTC');
  if (team.length > 0) {
    console.log('   ✅ PASS');
    passed++;
  } else {
    console.log('   ❌ FAIL: No team created');
    failed++;
  }
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
}
checkComplete();

// Test 3: Deep Research
console.log('3. Deep Research Mode...');
try {
  const DeepResearch = require('./skills/deep-research-mode/researcher');
  const researcher = new DeepResearch();
  console.log('   ✅ PASS');
  passed++;
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
}
checkComplete();

// Test 4: Intent Creation
console.log('4. Intent-Based Creation...');
try {
  const { IntentBasedCreation } = require('./skills/intent-based-creation/creator');
  const creator = new IntentBasedCreation();
  console.log('   ✅ PASS');
  passed++;
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
}
checkComplete();

// Test 5: Self-Improving
console.log('5. Self-Improving Agent...');
try {
  const SelfImproving = require('./skills/self-improving-agent/improver');
  const improver = new SelfImproving();
  improver.recordFeedback({ type: 'positive', message: 'test', satisfaction: 0.9 });
  console.log('   ✅ PASS');
  passed++;
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
}
checkComplete();

// Test 6: Predictive
console.log('6. Predictive Orchestration...');
try {
  const Predictive = require('./skills/predictive-orchestration/predictor');
  const predictor = new Predictive();
  console.log('   ✅ PASS');
  passed++;
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
}
checkComplete();

// Test 7: Gateway Manager
console.log('7. Gateway Lifecycle Manager...');
try {
  const { GatewayLifecycleManager } = require('./skills/gateway-lifecycle-manager/manager');
  const manager = new GatewayLifecycleManager();
  console.log('   ✅ PASS');
  passed++;
} catch (e) {
  console.log('   ❌ FAIL:', e.message);
  failed++;
}
checkComplete();

// Test 8: Gateway Status
console.log('8. Gateway Status...');
const socket = new net.Socket();
socket.setTimeout(2000);
socket.once('connect', () => {
  console.log('   ✅ PASS');
  passed++;
  socket.destroy();
  checkComplete();
});
socket.once('error', () => {
  console.log('   ❌ FAIL: Not responding');
  failed++;
  checkComplete();
});
socket.connect(18789, '127.0.0.1');
