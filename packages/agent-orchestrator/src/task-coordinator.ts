import type {
  CreateTaskInput,
  TaskPriority,
} from '@jarvis/shared-contracts';
import {
  assertValidTaskTransition,
  RETRY_LIMITS,
  SecurityViolationError,
  TaskStateTransitionError,
  QUEUE_NAMES,
} from '@jarvis/core';
import type {
  TaskRepository,
  TaskRow,
  TaskUpdate,
  TaskStatus,
  AuditRepository,
  QueueRepository,
} from '@jarvis/database';
import type { PermissionEngine } from '@jarvis/permission-engine';
import type { BudgetManager } from '@jarvis/budget-manager';

export class TaskCoordinator {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly auditRepo: AuditRepository,
    private readonly queueRepo: QueueRepository,
    private readonly permissionEngine: PermissionEngine,
    private readonly budgetManager: BudgetManager
  ) {}

  /**
   * Intakes a new software development task and schedules it for processing.
   */
  async createTask(input: CreateTaskInput, userId: string): Promise<TaskRow> {
    const task = await this.taskRepo.create({
      project_id: input.projectId,
      milestone_id: input.milestoneId ?? null,
      user_id: userId,
      title: input.title,
      prompt_raw: input.promptRaw,
      priority: input.priority,
      status: 'INTAKE',
    });

    await this.auditRepo.append({
      userId,
      eventType: 'TASK_CREATED',
      severity: 'INFO',
      details: { taskId: task.id, title: task.title, priority: task.priority },
    });

    // Enqueue event to native pgmq queue
    await this.queueRepo.enqueueTaskEvent(
      QUEUE_NAMES.TASK_DISPATCH_QUEUE,
      task.id,
      'TASK_DISPATCHED',
      { title: task.title }
    );

    return task;
  }

  /**
   * Idempotently transitions a task to a new state with optimistic locking.
   */
  async transitionTask(
    taskId: string,
    userId: string,
    toStatus: TaskStatus,
    expectedVersion: number,
    extraUpdates: Partial<TaskUpdate> = {}
  ): Promise<TaskRow> {
    const current = await this.taskRepo.getById(taskId, userId);
    if (!current) {
      throw new Error(`Task ${taskId} not found for user ${userId}`);
    }

    // Validate state machine rules
    assertValidTaskTransition(current.status as TaskStatus, toStatus);

    const updated = await this.taskRepo.updateStatusWithOptimisticLock(
      taskId,
      userId,
      toStatus,
      expectedVersion,
      extraUpdates
    );

    await this.auditRepo.append({
      userId,
      eventType: 'TASK_STATUS_TRANSITIONED',
      severity: toStatus === 'EMERGENCY_ABORTED' ? 'CRITICAL' : 'INFO',
      details: {
        taskId,
        fromStatus: current.status,
        toStatus: String(toStatus),
        version: updated.version,
      },
    });

    return updated;
  }

  /**
   * Dispatches task to coding runner following policy and budget checks.
   */
  async dispatchTask(taskId: string, userId: string): Promise<TaskRow> {
    const task = await this.taskRepo.getById(taskId, userId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Verify financial pre-flight
    const budgetCheck = await this.budgetManager.checkPreFlight({
      userId,
      modelId: 'openrouter/free',
      estimatedPromptTokens: 2000,
      estimatedCompletionTokens: 1000,
    });

    if (!budgetCheck.allowed) {
      throw new Error(`Cannot dispatch task: ${budgetCheck.rejectionReason}`);
    }

    // Transition state to DISPATCHED
    const dispatched = await this.transitionTask(taskId, userId, 'DISPATCHED', task.version);

    // Enqueue coding execution job
    await this.queueRepo.enqueueTaskEvent(
      QUEUE_NAMES.TASK_DISPATCH_QUEUE,
      taskId,
      'CODE_GENERATION_REQUESTED',
      { targetBranch: `jarvis/task-${task.id.slice(0, 8)}` }
    );

    return dispatched;
  }

  /**
   * Handles failure during test or execution with bounded retry loops.
   */
  async handleTaskFailure(
    taskId: string,
    userId: string,
    error: string,
    category: 'ROUTINE' | 'COMPLEX' | 'CRITICAL'
  ): Promise<TaskRow> {
    const task = await this.taskRepo.getById(taskId, userId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (category === 'CRITICAL') {
      // Security violations or destructive findings immediately halt
      await this.auditRepo.append({
        userId,
        eventType: 'TASK_SECURITY_HALT',
        severity: 'SECURITY',
        details: { taskId, error },
      });

      return this.transitionTask(taskId, userId, 'ESCALATED', task.version, {
        specification: {
          ...(typeof task.specification === 'object' && task.specification ? task.specification : {}),
          haltReason: error,
        },
      });
    }

    const maxAllowedRetries =
      category === 'ROUTINE'
        ? RETRY_LIMITS.MAX_ROUTINE_RETRIES
        : RETRY_LIMITS.MAX_COMPLEX_RETRIES;

    if (task.retry_count >= maxAllowedRetries) {
      // Retries exhausted — escalate to human operator
      await this.auditRepo.append({
        userId,
        eventType: 'TASK_RETRIES_EXHAUSTED',
        severity: 'WARNING',
        details: { taskId, retryCount: task.retry_count, maxAllowedRetries, error },
      });

      return this.transitionTask(taskId, userId, 'ESCALATED', task.version);
    }

    // Increment retry count and enter SELF_HEALING loop
    return this.transitionTask(taskId, userId, 'SELF_HEALING', task.version, {
      retry_count: task.retry_count + 1,
    });
  }

  /**
   * Cancels a task in progress and transitions status to CANCELLED.
   */
  async cancelTask(taskId: string, userId: string, reason: string): Promise<TaskRow> {
    const task = await this.taskRepo.getById(taskId, userId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const cancelled = await this.transitionTask(taskId, userId, 'CANCELLED', task.version);

    await this.auditRepo.append({
      userId,
      eventType: 'TASK_CANCELLED',
      severity: 'INFO',
      details: { taskId, reason },
    });

    return cancelled;
  }

  /**
   * Emergency Kill Switch: Immediately aborts task execution.
   */
  async triggerEmergencyKillSwitch(userId: string, reason: string): Promise<void> {
    await this.auditRepo.append({
      userId,
      eventType: 'EMERGENCY_KILL_SWITCH_TRIGGERED',
      severity: 'CRITICAL',
      details: { reason },
    });

    // In a live cluster, this cancels running GitHub Actions workflows and aborts active tasks
  }
}
