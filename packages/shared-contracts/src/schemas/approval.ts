import { z } from 'zod';

export const ActionTypeSchema = z.enum([
  'PROD_DEPLOY',
  'SEND_MESSAGE',
  'SPEND_FUNDS',
  'PAID_AI_INFERENCE',
  'MAJOR_ARCH_CHANGE',
  'SENSITIVE_DB_OP',
  'ACCOUNT_CHANGE',
  'DESTRUCTIVE_ACTION',
  'NEW_DEPENDENCY',
]);

export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']);

export const ApprovalDecisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

export type ActionType = z.infer<typeof ActionTypeSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;
