import { z } from "zod";
import { TestSummary, ExecutionArtifact } from "../types";

export const VerificationStageSchema = z.enum([
  "lint",
  "typecheck",
  "test",
  "build",
  "custom",
]);
export type VerificationStage = z.infer<typeof VerificationStageSchema>;

export const VerificationStageStatusSchema = z.enum([
  "passed",
  "failed",
  "skipped",
]);
export type VerificationStageStatus = z.infer<
  typeof VerificationStageStatusSchema
>;

export const VerificationStageResultSchema = z.object({
  stage: VerificationStageSchema,
  command: z.string(),
  status: VerificationStageStatusSchema,
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().nonnegative(),
  testMetrics: z
    .object({
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      skipped: z.number().int().nonnegative(),
    })
    .optional(),
  errorSummary: z.string().optional(),
});
export type VerificationStageResult = z.infer<
  typeof VerificationStageResultSchema
>;

export const VerificationHarnessConfigSchema = z.object({
  stages: z.array(VerificationStageSchema).default([
    "lint",
    "typecheck",
    "test",
    "build",
  ]),
  failFast: z.boolean().default(true),
  customCommand: z.string().optional(),
  timeoutMs: z.number().int().positive().default(60000),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  defaultCommands: z
    .record(VerificationStageSchema, z.string())
    .optional(),
  diffPatch: z.string().optional(),
  allowedFilePatterns: z.array(z.string()).optional(),
  allowDeletions: z.boolean().optional(),
});
export type VerificationHarnessConfig = z.infer<
  typeof VerificationHarnessConfigSchema
>;

export interface VerificationResult {
  status: "passed" | "failed" | "error";
  overallDurationMs: number;
  stages: VerificationStageResult[];
  summary: TestSummary;
  artifacts: ExecutionArtifact[];
  diffReport?: import("./diff-inspector/types").DiffInspectionReport;
  failureStage?: VerificationStage;
  failureDetails?: string;
}
