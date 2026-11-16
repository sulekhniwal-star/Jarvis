import { z } from "zod";
import { SpecificationPayload } from "../specifier/types";

export const StepRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type StepRiskLevel = z.infer<typeof StepRiskLevelSchema>;

export const StepActionTypeSchema = z.enum([
  "create",
  "modify",
  "delete",
  "command",
  "migration",
]);
export type StepActionType = z.infer<typeof StepActionTypeSchema>;

export const PlanStepSchema = z.object({
  id: z.string().min(1, "Step ID is required"),
  title: z.string().min(1, "Step title is required"),
  description: z.string().min(10, "Step description must be at least 10 characters"),
  filesTargeted: z.array(z.string()).min(1, "At least one targeted file is required"),
  actionType: StepActionTypeSchema,
  wave: z.number().int().positive("Wave must be a positive integer (1, 2, ...)"),
  dependencies: z.array(z.string()).default([]),
  riskLevel: StepRiskLevelSchema,
  requiresApproval: z.boolean(),
  approvalReason: z.string().optional(),
  verificationCommand: z.string().min(1, "Verification command is required"),
  rollbackProcedure: z.string().min(5, "Rollback procedure is required"),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

export const DependencyEdgeSchema = z.object({
  from: z.string().min(1, "From step ID is required"),
  to: z.string().min(1, "To step ID is required"),
});

export type DependencyEdge = z.infer<typeof DependencyEdgeSchema>;

export const RiskAssessmentSchema = z.object({
  overallRisk: StepRiskLevelSchema,
  riskFactors: z.array(z.string()),
  requiresHumanApproval: z.boolean(),
  mitigations: z.array(z.string()),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

export const PlanPayloadSchema = z.object({
  steps: z.array(PlanStepSchema).min(1, "At least one step is required in a plan"),
  dependencies: z.array(DependencyEdgeSchema),
  riskAssessment: RiskAssessmentSchema,
  requiredApprovals: z.array(z.string()),
});

export type PlanPayload = z.infer<typeof PlanPayloadSchema>;

export interface PlannerInput {
  taskId: string;
  specification: SpecificationPayload;
  projectContext?: string;
  userId?: string;
  runId?: string;
  projectId?: string;
  relevantMemories?: Array<{
    category: string;
    content: string;
    similarity?: number;
  }>;
}

export type PlannerAgentResponse = PlanPayload;
