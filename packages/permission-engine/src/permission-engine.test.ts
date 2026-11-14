import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isActionGated, ACTION_POLICIES } from './policy-matrix.js';
import { PermissionEngine } from './permission-engine.js';
import { PermissionDeniedError } from '@jarvis/core';
import type { ApprovalRepository, AuditRepository } from '@jarvis/database';

describe('Permission Policy Matrix', () => {
  it('identifies critical actions as gated', () => {
    assert.equal(isActionGated('PROD_DEPLOY'), true);
    assert.equal(isActionGated('SPEND_FUNDS'), true);
    assert.equal(isActionGated('PAID_AI_INFERENCE'), true);
    assert.equal(isActionGated('SENSITIVE_DB_OP'), true);
    assert.equal(isActionGated('ACCOUNT_CHANGE'), true);
    assert.equal(isActionGated('DESTRUCTIVE_ACTION'), true);
  });

  it('verifies all defined actions have explicit risk levels', () => {
    for (const [action, policy] of Object.entries(ACTION_POLICIES)) {
      assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(policy.riskLevel));
      assert.equal(policy.actionType, action);
    }
  });
});

describe('Permission Engine Evaluation & Lifecycle', () => {
  let storedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

  const mockAuditRepo = {
    append: async () => ({ id: 'audit-1' }),
  } as unknown as AuditRepository;

  const mockApprovalRepo = {
    createRequest: async (params: any) => ({
      id: 'ticket-123',
      task_id: params.taskId,
      user_id: params.userId,
      action_type: params.actionType,
      status: 'PENDING',
    }),
    resolveRequest: async (params: { approvalId: string; status: any }) => {
      storedStatus = params.status;
      return { id: params.approvalId, status: params.status };
    },
    getById: async (id: string) => ({
      id,
      status: storedStatus,
      action_type: 'PROD_DEPLOY',
    }),
  } as unknown as ApprovalRepository;

  const engine = new PermissionEngine(mockApprovalRepo, mockAuditRepo);

  it('gates PROD_DEPLOY and creates an approval ticket', async () => {
    const result = await engine.evaluateAction({
      userId: '00000000-0000-0000-0000-000000000001',
      taskId: '00000000-0000-0000-0000-000000000002',
      actionType: 'PROD_DEPLOY',
      payload: { environment: 'production', version: 'v1.0.0' },
      justification: 'Release to prod',
    });

    assert.equal(result.allowed, false);
    assert.equal(result.requiresApproval, true);
    assert.equal(result.approvalTicketId, 'ticket-123');
  });

  it('blocks execution when ticket is still PENDING', async () => {
    await assert.rejects(
      async () => engine.assertApproved('ticket-123', '00000000-0000-0000-0000-000000000001'),
      PermissionDeniedError
    );
  });

  it('resolves approval with human decision and allows execution', async () => {
    const resolution = await engine.resolveApproval(
      'ticket-123',
      '00000000-0000-0000-0000-000000000001',
      'APPROVED',
      'Verified in staging'
    );

    assert.equal(resolution.status, 'APPROVED');
    assert.equal(resolution.id, 'ticket-123');

    await assert.doesNotReject(async () =>
      engine.assertApproved('ticket-123', '00000000-0000-0000-0000-000000000001')
    );
  });
});
