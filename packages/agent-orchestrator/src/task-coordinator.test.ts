import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TaskCoordinator } from './task-coordinator.js';
import { TaskStateTransitionError } from '@jarvis/core';
import type { TaskRepository, AuditRepository, QueueRepository } from '@jarvis/database';
import type { PermissionEngine } from '@jarvis/permission-engine';
import type { BudgetManager } from '@jarvis/budget-manager';

describe('TaskCoordinator', () => {
  let currentStatus: any = 'INTAKE';
  let currentVersion = 1;

  const mockTaskRepo = {
    create: async (params: any) => ({
      id: 'task-1',
      version: 1,
      ...params,
    }),
    getById: async (id: string) => ({
      id,
      user_id: 'user-1',
      title: 'Implement feature',
      status: currentStatus,
      version: currentVersion,
      retry_count: 0,
      max_retries: 3,
    }),
    updateStatusWithOptimisticLock: async (
      id: string,
      _userId: string,
      toStatus: any,
      expectedVersion: number,
      _extraUpdates: any
    ) => {
      if (expectedVersion !== currentVersion) {
        throw new Error('Optimistic lock conflict');
      }
      currentVersion += 1;
      currentStatus = toStatus;
      return {
        id,
        user_id: 'user-1',
        title: 'Implement feature',
        status: currentStatus,
        version: currentVersion,
      };
    },
  } as unknown as TaskRepository;

  const mockAuditRepo = {
    append: async () => ({ id: 'audit-1' }),
  } as unknown as AuditRepository;

  const mockQueueRepo = {
    enqueueTaskEvent: async () => 1,
    enqueueAgentRun: async () => 1,
  } as unknown as QueueRepository;

  const mockPermissionEngine = {} as unknown as PermissionEngine;
  const mockBudgetManager = {} as unknown as BudgetManager;

  const coordinator = new TaskCoordinator(
    mockTaskRepo,
    mockAuditRepo,
    mockQueueRepo,
    mockPermissionEngine,
    mockBudgetManager
  );

  it('creates task in INTAKE status and enqueues event', async () => {
    const task = await coordinator.createTask(
      {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Implement feature',
        promptRaw: 'Build a login button',
        priority: 'MEDIUM',
      },
      'user-1'
    );

    assert.equal(task.id, 'task-1');
    assert.equal(task.status, 'INTAKE');
  });

  it('transitions task legally from INTAKE to SPECIFYING with optimistic lock', async () => {
    const updated = await coordinator.transitionTask(
      'task-1',
      'user-1',
      'SPECIFYING',
      1
    );

    assert.equal(updated.status, 'SPECIFYING');
    assert.equal(updated.version, 2);
  });

  it('rejects illegal transition from SPECIFYING to COMPLETED', async () => {
    await assert.rejects(
      async () => coordinator.transitionTask('task-1', 'user-1', 'COMPLETED', 2),
      TaskStateTransitionError
    );
  });
});
