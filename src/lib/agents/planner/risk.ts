import { PlanStep, RiskAssessment, StepRiskLevel } from "./types";

export interface PlanRiskEvaluationResult {
  riskAssessment: RiskAssessment;
  requiredApprovals: string[];
  reconciledSteps: PlanStep[];
}

export function evaluatePlanRisk(steps: PlanStep[]): PlanRiskEvaluationResult {
  const riskFactors: string[] = [];
  const mitigations: string[] = [];
  const requiredApprovalsSet = new Set<string>();

  const reconciledSteps: PlanStep[] = steps.map((step) => {
    let stepRisk: StepRiskLevel = step.riskLevel ?? "low";
    let stepRequiresApproval = step.requiresApproval ?? false;
    let stepApprovalReason = step.approvalReason;

    // 1. Database migrations check
    const isMigration =
      step.actionType === "migration" ||
      step.filesTargeted.some((f) => f.includes("supabase/migrations/"));

    if (isMigration) {
      stepRisk = "high";
      stepRequiresApproval = true;
      stepApprovalReason =
        stepApprovalReason ??
        "Database schema changes require human verification to prevent data loss.";
      riskFactors.push(`Step '${step.id}' applies database migrations.`);
      requiredApprovalsSet.add("database_migration");
      mitigations.push("Ensure idempotent SQL and rollback scripts are verified.");
    }

    // 2. Destructive operations check
    const isDestructive =
      step.actionType === "delete" ||
      step.description.toLowerCase().includes("delete") ||
      step.description.toLowerCase().includes("drop table") ||
      step.verificationCommand.toLowerCase().includes("rm -rf");

    if (isDestructive) {
      stepRisk = "critical";
      stepRequiresApproval = true;
      stepApprovalReason =
        stepApprovalReason ??
        "Destructive file/table deletions require explicit owner authorization.";
      riskFactors.push(`Step '${step.id}' contains destructive deletion actions.`);
      requiredApprovalsSet.add("destructive_operation");
      mitigations.push("Create filesystem/database backups before proceeding.");
    }

    // 3. Security/Auth boundaries check
    const isSecuritySensitive = step.filesTargeted.some(
      (f) =>
        f.includes("middleware.ts") ||
        f.includes("supabase/client.ts") ||
        f.includes("auth")
    );

    if (isSecuritySensitive && stepRisk === "low") {
      stepRisk = "medium";
      riskFactors.push(`Step '${step.id}' modifies authentication or middleware logic.`);
      mitigations.push("Run full auth and RLS security test suites.");
    }

    // 4. Git push remote check
    if (step.verificationCommand.includes("git push")) {
      stepRisk = "critical";
      stepRequiresApproval = true;
      stepApprovalReason = "Pushing to remote origin requires explicit owner approval.";
      requiredApprovalsSet.add("git_push_remote");
    }

    return {
      ...step,
      riskLevel: stepRisk,
      requiresApproval: stepRequiresApproval,
      approvalReason: stepApprovalReason,
    };
  });

  // Calculate overall risk: critical > high > medium > low
  let overallRisk: StepRiskLevel = "low";
  if (reconciledSteps.some((s) => s.riskLevel === "critical")) {
    overallRisk = "critical";
  } else if (reconciledSteps.some((s) => s.riskLevel === "high")) {
    overallRisk = "high";
  } else if (reconciledSteps.some((s) => s.riskLevel === "medium")) {
    overallRisk = "medium";
  }

  const requiresHumanApproval =
    reconciledSteps.some((s) => s.requiresApproval) ||
    overallRisk === "high" ||
    overallRisk === "critical";

  if (reconciledSteps.length > 5) {
    riskFactors.push(`Multi-wave plan with ${reconciledSteps.length} discrete steps.`);
    mitigations.push("Execute in waves with automated checkpoint verifications.");
  }

  return {
    riskAssessment: {
      overallRisk,
      riskFactors: Array.from(new Set(riskFactors)),
      requiresHumanApproval,
      mitigations: Array.from(new Set(mitigations)),
    },
    requiredApprovals: Array.from(requiredApprovalsSet),
    reconciledSteps,
  };
}
