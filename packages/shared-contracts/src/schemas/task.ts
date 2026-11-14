import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'INTAKE',
  'SPECIFYING',
  'PLANNING',
  'PENDING_APPROVAL',
  'DISPATCHED',
  'RUNNING',
  'TESTING',
  'SELF_HEALING',
  'PR_CREATED',
  'COMPLETED',
  'ESCALATED',
  'CANCELLED',
  'EMERGENCY_ABORTED',
]);

export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const TaskSpecificationSchema = z.object({
  userStories: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  suggestedDependencies: z.array(z.string()).default([]),
  clarifications: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().optional(),
      })
    )
    .default([]),
});

export const TaskPlanSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        targetFiles: z.array(z.string()),
        estimatedTokens: z.number().default(0),
        requiresApproval: z.boolean().default(false),
      })
    )
    .default([]),
  estimatedCostInr: z.number().default(0),
  preferredModel: z.string().default('openrouter/free'),
});

export const CreateTaskInputSchema = z.object({
  projectId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  promptRaw: z.string().min(5),
  priority: TaskPrioritySchema.default('MEDIUM'),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskSpecification = z.infer<typeof TaskSpecificationSchema>;
export type TaskPlan = z.infer<typeof TaskPlanSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
