import { GitHubClient } from "@/lib/github/client";
import {
  CodingTaskContext,
  CodingTaskResult,
  CodingTaskContextSchema,
  EngineValidationResult,
  BranchSecurityViolationError,
  ExecutionArtifact,
  TestSummary,
} from "../types";
import {
  ISandboxRunner,
  SandboxMode,
  SandboxExecutionConfig,
  SandboxRunnerError,
} from "./types";

export const DEFAULT_WORKFLOW_FILE = "coding-agent.yml";
export const DEFAULT_POLL_INTERVAL_MS = 2000;
export const DEFAULT_TIMEOUT_MS = 600000; // 10 minutes

/**
 * Executes coding tasks remotely inside ephemeral GitHub Actions container runners.
 * Strict zero-master-secret policy (NFR-SEC-02) and main-only branch locking (NFR-SEC-01).
 */
export class GitHubActionsSandboxRunner implements ISandboxRunner {
  public readonly mode: SandboxMode = "github_actions";
  private client: GitHubClient;
  private config: SandboxExecutionConfig;
  private owner: string;
  private repo: string;
  private workflowFile: string;
  private pollIntervalMs: number;
  private timeoutMs: number;

  constructor(
    client?: GitHubClient,
    config: SandboxExecutionConfig = {}
  ) {
    this.client = client ?? new GitHubClient();
    this.config = config;
    this.owner =
      config.owner ||
      process.env.GITHUB_REPOSITORY_OWNER ||
      "sulekhniwal-star";
    this.repo =
      config.repo ||
      process.env.GITHUB_REPOSITORY_NAME ||
      "Jarvis";
    this.workflowFile = config.workflowFileName || DEFAULT_WORKFLOW_FILE;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Validates GitHub credentials and repository reachability.
   */
  public async validateEnvironment(): Promise<EngineValidationResult> {
    const hasToken =
      Boolean(process.env.GITHUB_TOKEN) ||
      Boolean(process.env.GITHUB_APP_TOKEN);

    if (!hasToken) {
      return {
        valid: false,
        engineName: "github_actions",
        details: "GITHUB_TOKEN or GITHUB_APP_TOKEN is not configured.",
        missingRequirements: ["GITHUB_TOKEN"],
      };
    }

    try {
      const repo = await this.client.getRepository(this.owner, this.repo);
      return {
        valid: true,
        engineName: "github_actions",
        version: "GitHub Actions v2 API",
        details: `Connected to repository ${repo.full_name} (${repo.default_branch})`,
      };
    } catch (err) {
      return {
        valid: false,
        engineName: "github_actions",
        details: `Failed to access repository ${this.owner}/${this.repo}: ${(err as Error).message}`,
        missingRequirements: [`Read access to ${this.owner}/${this.repo}`],
      };
    }
  }

  /**
   * Dispatches the workflow to GitHub Actions and polls until conclusion.
   */
  public async execute(context: CodingTaskContext): Promise<CodingTaskResult> {
    // 1. Strict validation
    if (context.targetBranch !== "main") {
      throw new BranchSecurityViolationError(context.targetBranch);
    }
    const validated = CodingTaskContextSchema.parse(context);

    const dispatchTime = new Date();

    // 2. Safe inputs formulation (zero master secrets passed)
    const inputs: Record<string, string> = {
      task_id: validated.taskId,
      run_id: validated.runId,
      step_id: validated.stepId || "",
      allowed_files: JSON.stringify(validated.allowedFilePatterns),
      instructions: validated.scopedInstructions,
    };

    // 3. Dispatch workflow
    try {
      await this.client.dispatchWorkflow(
        this.owner,
        this.repo,
        this.workflowFile,
        "main",
        inputs
      );
    } catch (dispatchErr) {
      throw new SandboxRunnerError(
        `Failed to dispatch GitHub Actions workflow '${this.workflowFile}': ${(dispatchErr as Error).message}`
      );
    }

    // 4. Poll for run creation and conclusion
    const startTime = Date.now();
    let runId: number | undefined;

    while (Date.now() - startTime < this.timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));

      if (!runId) {
        // Find the triggered run
        const runs = await this.client.listWorkflowRuns(this.owner, this.repo, {
          branch: "main",
          event: "workflow_dispatch",
        });

        const matched = runs.find(
          (r) => new Date(r.created_at).getTime() >= dispatchTime.getTime() - 5000
        );

        if (matched) {
          runId = matched.id;
        }
      }

      if (runId) {
        const run = await this.client.getWorkflowRun(
          this.owner,
          this.repo,
          runId
        );

        if (run.status === "completed") {
          const isSuccess = run.conclusion === "success";

          const testSummary: TestSummary = {
            passed: isSuccess ? 1 : 0,
            failed: isSuccess ? 0 : 1,
            skipped: 0,
            durationMs: Date.now() - startTime,
          };

          const artifacts: ExecutionArtifact[] = [
            {
              name: `github-actions-run-${runId}.log`,
              artifactType: isSuccess ? "build_log" : "test_log",
              content: `GitHub Actions workflow run ${runId} concluded with: ${run.conclusion}\nHTML URL: ${run.html_url}`,
              mimeType: "text/plain",
            },
          ];

          return {
            runId: validated.runId,
            status: isSuccess ? "success" : "test_failure",
            exitCode: isSuccess ? 0 : 1,
            commitHash: run.head_sha,
            testSummary,
            artifacts,
            errorDetails: isSuccess
              ? undefined
              : `Workflow run ${runId} concluded with: ${run.conclusion}`,
          };
        }
      }
    }

    // Timed out
    throw new SandboxRunnerError(
      `GitHub Actions workflow execution timed out after ${this.timeoutMs}ms (Run ID: ${runId || "pending"})`
    );
  }
}
