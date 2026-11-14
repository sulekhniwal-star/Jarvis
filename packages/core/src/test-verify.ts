import {
  FINANCIAL_LIMITS,
  RETRY_LIMITS,
  BudgetExceededError,
  PermissionDeniedError,
  TaskStateTransitionError,
  SecurityViolationError,
} from './index.js';

console.log('--- Testing @jarvis/core Constants & Error Hierarchy ---');

// Test 1: Verify financial limits
if (FINANCIAL_LIMITS.DAILY_SPEND_CAP_INR !== 25.0) {
  throw new Error('Daily spend cap mismatch');
}
if (FINANCIAL_LIMITS.MONTHLY_SPEND_CAP_INR !== 750.0) {
  throw new Error('Monthly spend cap mismatch');
}
if (FINANCIAL_LIMITS.EMERGENCY_RESERVE_CAP_INR !== 250.0) {
  throw new Error('Emergency reserve cap mismatch');
}
if (FINANCIAL_LIMITS.MAX_MONTHLY_LIMIT_INR !== 1000.0) {
  throw new Error('Max monthly limit mismatch');
}
console.log('✓ Financial boundaries verified (INR 25/day, INR 750/mo, INR 1000 max).');

// Test 2: Verify retry limits
if (RETRY_LIMITS.MAX_ROUTINE_RETRIES !== 3) {
  throw new Error('Routine retries limit mismatch');
}
if (RETRY_LIMITS.MAX_COMPLEX_RETRIES !== 5) {
  throw new Error('Complex retries limit mismatch');
}
if (RETRY_LIMITS.MAX_SECURITY_RETRIES !== 0) {
  throw new Error('Security retries must be 0 (immediate halt)');
}
console.log('✓ Retry limits verified (3 routine, 5 complex, 0 security).');

// Test 3: Verify custom error types
const budgetErr = new BudgetExceededError('Exceeded daily cap', { currentSpend: 26.0 });
if (budgetErr.code !== 'BUDGET_EXCEEDED' || budgetErr.statusCode !== 403) {
  throw new Error('BudgetExceededError metadata mismatch');
}

const permErr = new PermissionDeniedError('Production deployment requires approval');
if (permErr.code !== 'PERMISSION_DENIED' || permErr.statusCode !== 403) {
  throw new Error('PermissionDeniedError metadata mismatch');
}

const transErr = new TaskStateTransitionError('INTAKE', 'COMPLETED', 'Must plan and run first');
if (transErr.code !== 'INVALID_STATE_TRANSITION' || transErr.statusCode !== 400) {
  throw new Error('TaskStateTransitionError metadata mismatch');
}

const secErr = new SecurityViolationError('Blacklisted path touched');
if (secErr.code !== 'SECURITY_VIOLATION' || secErr.statusCode !== 400) {
  throw new Error('SecurityViolationError metadata mismatch');
}

console.log('✓ Error hierarchy and codes verified.');
console.log('--- All @jarvis/core verification assertions passed! ---');
