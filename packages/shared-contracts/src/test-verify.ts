import {
  CreateTaskInputSchema,
  TaskSpecificationSchema,
  ApprovalDecisionSchema,
  BudgetLedgerEntrySchema,
  QueueTaskMessageSchema,
} from './index.js';

console.log('--- Testing @jarvis/shared-contracts Zod Schemas ---');

// Test 1: Task creation validation
const validTask = CreateTaskInputSchema.parse({
  projectId: '11111111-1111-1111-1111-111111111111',
  title: 'Setup Database Migrations',
  promptRaw: 'Create all tables and strict RLS policies for PostgreSQL.',
  priority: 'HIGH',
});
console.log('✓ CreateTaskInputSchema passed for valid task input.');

// Test 2: Task specification validation
const validSpec = TaskSpecificationSchema.parse({
  userStories: ['As a developer, I want isolated execution.'],
  acceptanceCriteria: ['Pass unit tests', 'Confirm zero secret leaks'],
  outOfScope: ['Production deployments without approval'],
  suggestedDependencies: ['@supabase/supabase-js'],
});
console.log('✓ TaskSpecificationSchema passed with complete specification structure.');

// Test 3: Approval decision validation
const validApproval = ApprovalDecisionSchema.parse({
  approvalId: '22222222-2222-2222-2222-222222222222',
  decision: 'APPROVED',
  comment: 'Reviewed and confirmed acceptable spend.',
});
console.log('✓ ApprovalDecisionSchema passed.');

// Test 4: Budget Ledger entry validation
const validLedger = BudgetLedgerEntrySchema.parse({
  userId: '00000000-0000-0000-0000-000000000001',
  billingDate: '2026-11-14',
  amountInr: 12.5,
  amountUsd: 0.1428,
  provider: 'OpenRouter',
  modelId: 'anthropic/claude-3.7-sonnet',
  isActual: true,
});
console.log('✓ BudgetLedgerEntrySchema passed with exact amounts.');

// Test 5: Queue Message validation
const validQueueMsg = QueueTaskMessageSchema.parse({
  taskId: '33333333-3333-3333-3333-333333333333',
  eventType: 'TASK_DISPATCHED',
  enqueuedAt: new Date().toISOString(),
  payload: { runner: 'GITHUB_ACTIONS', branch: 'jarvis/task-333' },
});
console.log('✓ QueueTaskMessageSchema passed for pgmq integration.');

console.log('--- All @jarvis/shared-contracts verification assertions passed! ---');
