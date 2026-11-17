export type RecommendationCategory =
  | "cost_budget"
  | "model_health"
  | "test_reliability"
  | "stale_tasks"
  | "storage_hygiene"
  | "branch_safety";

export type RecommendationSeverity = "critical" | "warning" | "info";

export type RemediationActionType =
  | "unlock_emergency_reserve"
  | "reset_circuit_breaker"
  | "prune_storage"
  | "clean_extraneous_branches"
  | "expire_stale_approvals"
  | "retry_failed_task";

export interface RemediationAction {
  type: RemediationActionType;
  label: string;
  description: string;
  endpoint?: string;
  payload?: Record<string, unknown>;
}

export interface MaintenanceRecommendation {
  id: string;
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  rationale: string;
  detectedAt: string;
  remediation?: RemediationAction;
  dismissed?: boolean;
}

export interface AdvisoryReport {
  timestamp: string;
  totalRecommendations: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  recommendations: MaintenanceRecommendation[];
}

export interface RemediationExecutionResult {
  success: boolean;
  actionType: RemediationActionType;
  executedAt: string;
  message: string;
  durationMs: number;
  details?: Record<string, unknown>;
  error?: string;
}
