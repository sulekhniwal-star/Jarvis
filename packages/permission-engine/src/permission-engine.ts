import type { ActionType, ApprovalStatus } from '@jarvis/shared-contracts';
import { PermissionDeniedError } from '@jarvis/core';
import type { ApprovalRepository, AuditRepository } from '@jarvis/database';
import { isActionGated, ACTION_POLICIES } from './policy-matrix.js';

export interface ActionRequest {
  userId: string;
  taskId: string;
  actionType: ActionType;
  payload: Record<string, unknown>;
  justification?: string;
}

export interface EvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  approvalTicketId?: string;
  reason?: string;
}

export class PermissionEngine {
  constructor(
    private readonly approvalRepo: ApprovalRepository,
    private readonly auditRepo: AuditRepository
  ) {}

  /**
   * Evaluates whether an agent action can proceed autonomously or requires human approval.
   */
  async evaluateAction(request: ActionRequest): Promise<EvaluationResult> {
    const policy = ACTION_POLICIES[request.actionType];
    const isGated = isActionGated(request.actionType);

    if (!isGated) {
      // Action is autonomous
      await this.auditRepo.append({
        userId: request.userId,
        eventType: 'ACTION_AUTONOMOUSLY_PERMITTED',
        severity: 'INFO',
        details: { actionType: request.actionType, taskId: request.taskId },
      });

      return {
        allowed: true,
        requiresApproval: false,
      };
    }

    // Action is gated — generate an Approval Ticket in database
    const ticket = await this.approvalRepo.createRequest({
      taskId: request.taskId,
      userId: request.userId,
      actionType: request.actionType,
      payloadPreview: {
        ...request.payload,
        justification: request.justification,
        riskLevel: policy.riskLevel,
      },
    });

    await this.auditRepo.append({
      userId: request.userId,
      eventType: 'APPROVAL_REQUEST_CREATED',
      severity: policy.riskLevel === 'CRITICAL' ? 'WARNING' : 'INFO',
      details: {
        approvalId: ticket.id,
        actionType: request.actionType,
        taskId: request.taskId,
      },
    });

    return {
      allowed: false,
      requiresApproval: true,
      approvalTicketId: ticket.id,
      reason: `Action '${request.actionType}' requires explicit human approval (${policy.description}).`,
    };
  }

  /**
   * Resolves an approval ticket (APPROVED or REJECTED) with audit logging.
   */
  async resolveApproval(
    approvalTicketId: string,
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    responseNote?: string
  ): Promise<{ id: string; status: ApprovalStatus }> {
    const updated = await this.approvalRepo.resolveRequest({
      approvalId: approvalTicketId,
      userId,
      status,
      userComment: responseNote,
    });

    await this.auditRepo.append({
      userId,
      eventType: status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      severity: 'INFO',
      details: {
        approvalId: approvalTicketId,
        decision: status,
        responseNote,
      },
    });

    return updated as { id: string; status: ApprovalStatus };
  }

  /**
   * Asserts whether an existing approval ticket is approved and valid.
   */
  async assertApproved(approvalTicketId: string, userId: string): Promise<void> {
    const ticket = await this.approvalRepo.getById(approvalTicketId, userId);

    if (!ticket) {
      throw new PermissionDeniedError(`Approval ticket ${approvalTicketId} not found.`);
    }

    if (ticket.status !== 'APPROVED') {
      throw new PermissionDeniedError(
        `Action blocked: Approval ticket ${approvalTicketId} has status '${ticket.status}'.`
      );
    }
  }
}
