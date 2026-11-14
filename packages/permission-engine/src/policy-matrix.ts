import type { ActionType } from '@jarvis/shared-contracts';

export interface ActionPolicy {
  actionType: ActionType;
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export const ACTION_POLICIES: Record<ActionType, ActionPolicy> = {
  PROD_DEPLOY: {
    actionType: 'PROD_DEPLOY',
    requiresApproval: true,
    riskLevel: 'CRITICAL',
    description: 'Promoting or deploying software to production infrastructure.',
  },
  SEND_MESSAGE: {
    actionType: 'SEND_MESSAGE',
    requiresApproval: true,
    riskLevel: 'HIGH',
    description: 'Dispatching external emails, WhatsApp messages, or notifications to customers.',
  },
  SPEND_FUNDS: {
    actionType: 'SPEND_FUNDS',
    requiresApproval: true,
    riskLevel: 'HIGH',
    description: 'Direct monetary expenditure or purchasing cloud compute credits.',
  },
  PAID_AI_INFERENCE: {
    actionType: 'PAID_AI_INFERENCE',
    requiresApproval: true,
    riskLevel: 'MEDIUM',
    description: 'Invoking commercial, paid LLM endpoints on OpenRouter.',
  },
  MAJOR_ARCH_CHANGE: {
    actionType: 'MAJOR_ARCH_CHANGE',
    requiresApproval: true,
    riskLevel: 'HIGH',
    description: 'Modifying core architectural boundaries, schemas, or protocols.',
  },
  SENSITIVE_DB_OP: {
    actionType: 'SENSITIVE_DB_OP',
    requiresApproval: true,
    riskLevel: 'CRITICAL',
    description: 'Executing database operations that drop tables, alter RLS, or bulk-mutate data.',
  },
  ACCOUNT_CHANGE: {
    actionType: 'ACCOUNT_CHANGE',
    requiresApproval: true,
    riskLevel: 'CRITICAL',
    description: 'Modifying user account settings, SSH keys, or OAuth integrations.',
  },
  DESTRUCTIVE_ACTION: {
    actionType: 'DESTRUCTIVE_ACTION',
    requiresApproval: true,
    riskLevel: 'CRITICAL',
    description: 'Permanently deleting repositories, branches, or backups.',
  },
  NEW_DEPENDENCY: {
    actionType: 'NEW_DEPENDENCY',
    requiresApproval: true,
    riskLevel: 'MEDIUM',
    description: 'Introducing dependencies that request broad system permissions.',
  },
};

export function isActionGated(actionType: ActionType): boolean {
  return ACTION_POLICIES[actionType]?.requiresApproval ?? true;
}
