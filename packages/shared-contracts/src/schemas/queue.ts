import { z } from 'zod';

export const QueueTaskMessageSchema = z.object({
  taskId: z.string().uuid(),
  eventType: z.enum([
    'TASK_DISPATCHED',
    'AGENT_RUN_SCHEDULED',
    'CODE_GENERATION_REQUESTED',
    'QA_VERIFICATION_REQUESTED',
    'TASK_CANCELLED',
    'EMERGENCY_STOP',
  ]),
  enqueuedAt: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type QueueTaskMessage = z.infer<typeof QueueTaskMessageSchema>;
