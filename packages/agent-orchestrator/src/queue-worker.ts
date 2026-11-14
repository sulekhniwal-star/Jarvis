import { QueueTaskMessageSchema, type QueueTaskMessage } from '@jarvis/shared-contracts';
import { QUEUE_NAMES } from '@jarvis/core';
import type { QueueRepository, AuditRepository } from '@jarvis/database';
import type { TaskCoordinator } from './task-coordinator.js';

export class QueueWorker {
  private isRunning = false;

  constructor(
    private readonly queueRepo: QueueRepository,
    private readonly auditRepo: AuditRepository,
    private readonly taskCoordinator: TaskCoordinator
  ) {}

  /**
   * Processes a single batch of pending messages from pgmq.
   */
  async processBatch(batchSize = 5): Promise<number> {
    const messages = await this.queueRepo.readMessages<QueueTaskMessage>(
      QUEUE_NAMES.TASK_DISPATCH_QUEUE,
      300, // 5 min visibility timeout
      batchSize
    );

    let processedCount = 0;

    for (const msg of messages) {
      try {
        const parsed = QueueTaskMessageSchema.safeParse(msg.message);
        if (!parsed.success) {
          // Unparseable message — delete or archive to prevent poison pill loops
          await this.queueRepo.deleteMessage(QUEUE_NAMES.TASK_DISPATCH_QUEUE, msg.msgId);
          continue;
        }

        // Process message according to event type
        await this.handleEvent(parsed.data);

        // Acknowledge / delete message after successful handling
        await this.queueRepo.deleteMessage(QUEUE_NAMES.TASK_DISPATCH_QUEUE, msg.msgId);
        processedCount++;
      } catch (err) {
        await this.auditRepo.append({
          eventType: 'QUEUE_PROCESSING_ERROR',
          severity: 'WARNING',
          details: { msgId: msg.msgId, error: err instanceof Error ? err.message : String(err) },
        });
        // Leave message in queue: visibility timeout will expire and message will retry
      }
    }

    return processedCount;
  }

  private async handleEvent(event: QueueTaskMessage): Promise<void> {
    switch (event.eventType) {
      case 'TASK_DISPATCHED':
        // Handle task dispatch event
        break;
      case 'CODE_GENERATION_REQUESTED':
        // Handle code generation event
        break;
      case 'EMERGENCY_STOP':
        // Abort event
        break;
      default:
        break;
    }
  }
}
