import { z } from "zod";

/**
 * Artifact Types supported by coding agent execution runners.
 */
export const ArtifactTypeSchema = z.enum([
  "test_log",
  "build_log",
  "diff",
  "patch",
  "screenshot",
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

/**
 * Single execution artifact generated during a coding agent run.
 */
export const ExecutionArtifactSchema = z.object({
  name: z.string().min(1, "Artifact name is required"),
  artifactType: ArtifactTypeSchema,
  content: z.union([
    z.string(),
    z.custom<Buffer>(
      (val) => typeof Buffer !== "undefined" && Buffer.isBuffer(val),
      { message: "Must be a string or Buffer" }
    ),
  ]),
  mimeType: z.string().min(1, "MIME type is required"),
  path: z.string().optional(),
});
export type ExecutionArtifact = z.infer<typeof ExecutionArtifactSchema>;

/**
 * Summary of test suite results executed during verification.
 */
export const TestSummarySchema = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative().default(0),
  durationMs: z.number().nonnegative(),
});
export type TestSummary = z.infer<typeof TestSummarySchema>;

/**
 * Overall task execution completion status.
 */
export const TaskExecutionStatusSchema = z.enum([
  "success",
  "test_failure",
  "timeout",
  "error",
]);
export type TaskExecutionStatus = z.infer<typeof TaskExecutionStatusSchema>;

/**
 * Output result produced by a coding agent engine upon task execution.
 */
export const CodingTaskResultSchema = z.object({
  runId: z.string().uuid("runId must be a valid UUID"),
  status: TaskExecutionStatusSchema,
  exitCode: z.number().int(),
  commitHash: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/i, "commitHash must be a valid 7 to 40 character git SHA")
    .optional(),
  diffPatch: z.string().optional(),
  testSummary: TestSummarySchema,
  artifacts: z.array(ExecutionArtifactSchema).default([]),
  errorDetails: z.string().optional(),
});
export type CodingTaskResult = z.infer<typeof CodingTaskResultSchema>;

/**
 * Input context passed to a coding agent engine to execute an isolated task.
 * Note: targetBranch is locked strictly to "main" (NFR-SEC-01).
 */
export const CodingTaskContextSchema = z.object({
  taskId: z.string().uuid("taskId must be a valid UUID"),
  runId: z.string().uuid("runId must be a valid UUID"),
  stepId: z.string().min(1).optional(),
  projectSlug: z.string().min(1, "projectSlug is required"),
  repositoryUrl: z.string().min(1, "repositoryUrl is required"),
  targetBranch: z.literal("main", {
    message:
      "targetBranch must strictly be 'main'. Non-main branches are blocked by system policy (NFR-SEC-01).",
  }),
  scopedInstructions: z
    .string()
    .min(10, "scopedInstructions must be at least 10 characters long"),
  allowedFilePatterns: z
    .array(z.string().min(1))
    .min(1, "At least one allowed file pattern is required"),
  maxRetries: z.number().int().positive().default(3),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CodingTaskContext = z.infer<typeof CodingTaskContextSchema>;

/**
 * Result of environment verification for a coding agent engine.
 */
export interface EngineValidationResult {
  valid: boolean;
  engineName: string;
  version?: string;
  details?: string;
  missingRequirements?: string[];
}

/**
 * Provider-agnostic interface that all coding agent adapters must implement.
 */
export interface ICodingAgentEngine {
  readonly engineName: string;
  executeTask(context: CodingTaskContext): Promise<CodingTaskResult>;
  validateEnvironment(): Promise<EngineValidationResult>;
}

/**
 * Base error class for coding agent engine exceptions.
 */
export class CodingEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodingEngineError";
  }
}

/**
 * Error thrown when a requested coding agent engine is not registered.
 */
export class EngineNotFoundError extends CodingEngineError {
  constructor(engineName: string) {
    super(`Coding agent engine '${engineName}' is not registered`);
    this.name = "EngineNotFoundError";
  }
}

/**
 * Error thrown when an operation violates the main-only branch constraint (NFR-SEC-01).
 */
export class BranchSecurityViolationError extends CodingEngineError {
  constructor(targetBranch: string) {
    super(
      `Branch security violation: Attempted to target '${targetBranch}'. Only 'main' is permitted (NFR-SEC-01).`
    );
    this.name = "BranchSecurityViolationError";
  }
}

/**
 * Error thrown when execution fails inside an engine.
 */
export class EngineExecutionError extends CodingEngineError {
  public readonly exitCode?: number;
  public readonly details?: string;

  constructor(message: string, exitCode?: number, details?: string) {
    super(message);
    this.name = "EngineExecutionError";
    this.exitCode = exitCode;
    this.details = details;
  }
}
