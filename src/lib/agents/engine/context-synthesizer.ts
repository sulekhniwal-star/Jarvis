import { PlanStep } from "../planner/types";
import {
  CodingTaskContext,
  CodingTaskContextSchema,
  BranchSecurityViolationError,
  CodingEngineError,
} from "./types";

export interface SynthesizeContextParams {
  taskId: string;
  runId: string;
  step: PlanStep;
  project: {
    slug: string;
    repositoryUrl: string;
    name?: string;
  };
  taskContext?: {
    title?: string;
    description?: string;
    userPrompt?: string;
  };
  acceptanceCriteria?: string[];
  targetBranch?: string;
  maxRetries?: number;
  env?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * List of sensitive key patterns that must never be passed to sandbox environments.
 */
const SENSITIVE_ENV_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /DATABASE_URL/i,
  /POSTGRES_PASSWORD/i,
  /TELEGRAM_BOT_TOKEN/i,
  /GITHUB_WEBHOOK_SECRET/i,
  /MASTER_SECRET/i,
  /ADMIN_KEY/i,
  /PRIVATE_KEY/i,
  /SECRET_KEY/i,
];

/**
 * Sanitizes and normalizes targeted file patterns, preventing directory traversal.
 * @throws CodingEngineError if path traversal or malicious path detected.
 */
export function sanitizeFilePatterns(patterns: string[]): string[] {
  if (!patterns || patterns.length === 0) {
    throw new CodingEngineError(
      "No file patterns provided: Coding tasks must specify at least one target file pattern."
    );
  }

  const sanitized: string[] = [];

  for (const raw of patterns) {
    if (!raw || typeof raw !== "string") continue;

    // Normalize slashes
    let normalized = raw.trim().replace(/\\/g, "/");

    // Check for directory traversal attempts
    if (
      normalized.includes("../") ||
      normalized.includes("/..") ||
      normalized === ".." ||
      normalized.startsWith("./..")
    ) {
      throw new CodingEngineError(
        `Path traversal detected in file pattern: '${raw}'. Sandboxes restrict modifications to local repository paths.`
      );
    }

    // Check for absolute root or drive letter escapes (e.g. /etc or C:/)
    if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
      throw new CodingEngineError(
        `Absolute file path escapes are forbidden: '${raw}'. Relative project path required.`
      );
    }

    // Strip leading ./
    if (normalized.startsWith("./")) {
      normalized = normalized.slice(2);
    }

    // Strip trailing slashes
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }

    if (normalized.length > 0 && !sanitized.includes(normalized)) {
      sanitized.push(normalized);
    }
  }

  if (sanitized.length === 0) {
    throw new CodingEngineError(
      "All file patterns were invalid or filtered out. At least one valid relative path is required."
    );
  }

  return sanitized;
}

/**
 * Filters environment variables to eliminate master secrets and sensitive credentials.
 */
export function sanitizeEnvironmentVariables(
  env?: Record<string, string>
): Record<string, string> {
  if (!env) return {};

  const cleanEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    const isSensitive = SENSITIVE_ENV_PATTERNS.some((pattern) =>
      pattern.test(key)
    );

    if (!isSensitive) {
      cleanEnv[key] = value;
    }
  }

  return cleanEnv;
}

/**
 * Compiles a structured, unambiguous Markdown prompt from the approved execution step.
 */
export function compileScopedInstructions(params: SynthesizeContextParams): string {
  const { step, project, taskContext, acceptanceCriteria } = params;

  const sections: string[] = [];

  // Header & Step Goal
  sections.push(`# Task Execution: ${step.title}`);
  sections.push(
    `Project: **${project.name || project.slug}** | Step ID: \`${step.id}\` | Action: \`${step.actionType.toUpperCase()}\``
  );

  // High-level Task Context if present
  if (taskContext?.title || taskContext?.description) {
    sections.push(`## Overall Task Goal\n${taskContext.title || ""}\n${taskContext.description || ""}`);
  }

  // Step Description
  sections.push(`## Step Objective\n${step.description}`);

  // Targeted File Boundaries
  sections.push(
    `## File Modification Boundaries\nYou are strictly restricted to creating or modifying ONLY the following files:\n${step.filesTargeted.map((f) => `- \`${f}\``).join("\n")}\n\nDo not modify other files unless required for type imports.`
  );

  // Verification Command
  sections.push(
    `## Verification Criteria\nExecute the following verification command to confirm completion:\n\`\`\`bash\n${step.verificationCommand}\n\`\`\`\nAll tests or checks must pass with exit code 0.`
  );

  // Rollback Procedure
  if (step.rollbackProcedure) {
    sections.push(
      `## Rollback Procedure\nIn case of irrecoverable failure:\n${step.rollbackProcedure}`
    );
  }

  // Acceptance Criteria
  if (acceptanceCriteria && acceptanceCriteria.length > 0) {
    sections.push(
      `## Acceptance Criteria\n${acceptanceCriteria.map((c) => `- [ ] ${c}`).join("\n")}`
    );
  }

  return sections.join("\n\n");
}

/**
 * Functional synthesizer translating approved execution step details into a validated CodingTaskContext.
 */
export function synthesizeCodingTaskContext(
  params: SynthesizeContextParams
): CodingTaskContext {
  const targetBranch = params.targetBranch ?? "main";

  // Strict NFR-SEC-01 check
  if (targetBranch !== "main") {
    throw new BranchSecurityViolationError(targetBranch);
  }

  const allowedFilePatterns = sanitizeFilePatterns(params.step.filesTargeted);
  const environmentVariables = sanitizeEnvironmentVariables(params.env);
  const scopedInstructions = compileScopedInstructions(params);

  const rawContext = {
    taskId: params.taskId,
    runId: params.runId,
    stepId: params.step.id,
    projectSlug: params.project.slug,
    repositoryUrl: params.project.repositoryUrl,
    targetBranch: "main" as const,
    scopedInstructions,
    allowedFilePatterns,
    maxRetries: params.maxRetries ?? 3,
    environmentVariables,
    metadata: {
      ...params.metadata,
      wave: params.step.wave,
      riskLevel: params.step.riskLevel,
      actionType: params.step.actionType,
      verificationCommand: params.step.verificationCommand,
    },
  };

  // Validate against Zod schema
  return CodingTaskContextSchema.parse(rawContext);
}

/**
 * TaskContextSynthesizer class for dependency injection and stateful usage.
 */
export class TaskContextSynthesizer {
  public synthesize(params: SynthesizeContextParams): CodingTaskContext {
    return synthesizeCodingTaskContext(params);
  }

  public sanitizeFilePatterns(patterns: string[]): string[] {
    return sanitizeFilePatterns(patterns);
  }

  public sanitizeEnvironmentVariables(
    env?: Record<string, string>
  ): Record<string, string> {
    return sanitizeEnvironmentVariables(env);
  }

  public compileScopedInstructions(params: SynthesizeContextParams): string {
    return compileScopedInstructions(params);
  }
}
