export type DeploymentEnvironment = "preview" | "production";

export type DeploymentStatus =
  | "pending_approval"
  | "building"
  | "deployed"
  | "failed"
  | "rolled_back";

export interface DeploymentRecord {
  id: string;
  environment: DeploymentEnvironment;
  commit_sha: string;
  commit_message: string;
  branch: string;
  status: DeploymentStatus;
  preview_url?: string | null;
  production_url?: string | null;
  approval_id?: string | null;
  created_by?: string | null;
  rollback_target_id?: string | null;
  verification_passed: boolean;
  verification_summary?: string | null;
  error_message?: string | null;
  deployed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeploymentFilterOptions {
  environment?: DeploymentEnvironment;
  status?: DeploymentStatus;
  limit?: number;
  offset?: number;
}

export interface CreatePreviewDeploymentInput {
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  userId?: string | null;
}

export interface PromotionRequestInput {
  commitSha: string;
  commitMessage?: string;
  branch?: string;
  verificationSummary?: string;
  notes?: string;
  telegramChatId?: string | number;
}

export interface RollbackResult {
  success: boolean;
  rollbackDeployment: DeploymentRecord;
  activeDeployment: DeploymentRecord;
  rolledBackFromId: string;
  rolledBackToId: string;
  targetCommitSha: string;
  message: string;
}

export class UnapprovedProductionDeploymentError extends Error {
  constructor(
    message: string = "Production promotion strictly requires an approved approval record."
  ) {
    super(message);
    this.name = "UnapprovedProductionDeploymentError";
  }
}

export class DeploymentNotFoundError extends Error {
  constructor(id: string) {
    super(`Deployment '${id}' was not found.`);
    this.name = "DeploymentNotFoundError";
  }
}

export class InvalidRollbackTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRollbackTargetError";
  }
}
