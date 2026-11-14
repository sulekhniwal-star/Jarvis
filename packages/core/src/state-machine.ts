import type { TaskStatus } from '@jarvis/shared-contracts';
import { TaskStateTransitionError } from './errors.js';

export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  INTAKE: ['SPECIFYING', 'CANCELLED', 'EMERGENCY_ABORTED'],
  SPECIFYING: ['PLANNING', 'INTAKE', 'CANCELLED', 'EMERGENCY_ABORTED'],
  PLANNING: ['PENDING_APPROVAL', 'DISPATCHED', 'CANCELLED', 'EMERGENCY_ABORTED'],
  PENDING_APPROVAL: ['DISPATCHED', 'PLANNING', 'ESCALATED', 'CANCELLED', 'EMERGENCY_ABORTED'],
  DISPATCHED: ['RUNNING', 'CANCELLED', 'EMERGENCY_ABORTED'],
  RUNNING: ['TESTING', 'SELF_HEALING', 'ESCALATED', 'CANCELLED', 'EMERGENCY_ABORTED'],
  TESTING: ['SELF_HEALING', 'PR_CREATED', 'COMPLETED', 'ESCALATED', 'EMERGENCY_ABORTED'],
  SELF_HEALING: ['RUNNING', 'TESTING', 'ESCALATED', 'CANCELLED', 'EMERGENCY_ABORTED'],
  PR_CREATED: ['COMPLETED', 'CANCELLED', 'EMERGENCY_ABORTED'],
  COMPLETED: [], // Terminal
  ESCALATED: ['PLANNING', 'DISPATCHED', 'CANCELLED', 'EMERGENCY_ABORTED'],
  CANCELLED: [], // Terminal
  EMERGENCY_ABORTED: [], // Terminal
};

export function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true; // Idempotent same-state check
  const allowed = VALID_TASK_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isValidTaskTransition(from, to)) {
    throw new TaskStateTransitionError(
      from,
      to,
      `Allowed transitions from ${from}: [${(VALID_TASK_TRANSITIONS[from] || []).join(', ')}]`
    );
  }
}
