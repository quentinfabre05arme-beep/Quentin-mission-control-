/**
 * Autonomous Decision Engine
 * Core logic for deciding when to act vs when to ask
 */

const { logDecision, shouldAskFirst, involvesMoney } = require('./audit_logger');

/**
 * Execute an action autonomously with logging
 */
async function executeAutonomous({ action, confidence, executor, context = {} }) {
  // Step 1: Check if money is involved
  if (involvesMoney(action)) {
    logDecision({
      action: `${action} (BLOCKED — requires approval)`,
      confidence,
      should_have_asked: true,
      notes: 'Action blocked: involves spending money'
    });
    return {
      status: 'BLOCKED',
      reason: 'Involves spending money — requires explicit approval',
      requires_approval: true
    };
  }
  
  // Step 2: Check confidence threshold
  const needsApproval = shouldAskFirst({
    confidence,
    external_impact: context.external_impact || false
  });
  
  if (needsApproval) {
    logDecision({
      action: `${action} (DEFERRED — low confidence)`,
      confidence,
      should_have_asked: true,
      notes: `Confidence ${(confidence * 100).toFixed(0)}% below threshold`
    });
    return {
      status: 'DEFERRED',
      reason: `Confidence too low (${(confidence * 100).toFixed(0)}%) — asking first`,
      requires_approval: true
    };
  }
  
  // Step 3: Execute
  let result;
  let error = null;
  
  try {
    result = await executor();
  } catch (e) {
    error = e;
  }
  
  // Step 4: Log
  logDecision({
    action,
    confidence,
    estimated_value: context.estimated_value || '',
    reversible: context.reversible !== false,
    undo_command: context.undo_command || '',
    notes: error ? `Error: ${error.message}` : 'Completed successfully',
    should_have_asked: !!error
  });
  
  if (error) {
    return {
      status: 'ERROR',
      error: error.message,
      requires_approval: true
    };
  }
  
  return {
    status: 'COMPLETED',
    result,
    logged: true
  };
}

/**
 * Quick check: Can I do this without asking?
 */
function canActAutonomously({ action, confidence, isExternal = false }) {
  if (involvesMoney(action)) return false;
  if (confidence < 0.5) return false;
  if (isExternal && confidence < 0.8) return false;
  return true;
}

module.exports = {
  executeAutonomous,
  canActAutonomously
};
