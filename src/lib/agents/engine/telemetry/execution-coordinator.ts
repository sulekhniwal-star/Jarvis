import * as crypto from "crypto";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { SandboxOrchestrator, sandboxOrchestrator } from "../sandbox/sandbox-orchestrator";
import { synthesizeCodingTaskContext } from "../context-synthesizer";
import { ArtifactPipeline } from "./artifact-pipeline";
import { CoordinatorExecutionParams, ExecutionRunSummary } from "./types";
import { TelegramClient } from "@/lib/telegram/client";
import { escapeMarkdownV2 } from "@/lib/telegram/format";

export interface ExecutionCoordinatorOptions {
  taskRepo?: TaskRepository;
  agentRunRepo?: AgentRunRepository;
  orchestrator?: SandboxOrchestrator;
  pipeline?: ArtifactPipeline;
  telegramClient?: TelegramClient;
  ownerTelegramId?: string;
}

/**
 * Coordinates end-to-end task step execution, transitioning Task and AgentRun state machines,
 * invoking ephemeral sandbox runners, recording artifacts, and broadcasting telemetry (REQ-EX-04).
 */
export class ExecutionCoordinator {
  private taskRepo?: TaskRepository;
  private agentRunRepo?: AgentRunRepository;
  private orchestrator: SandboxOrchestrator;
  private pipeline: ArtifactPipeline;
  private telegramClient?: TelegramClient;
  private ownerTelegramId?: string;

  constructor(options: ExecutionCoordinatorOptions = {}) {
    this.taskRepo = options.taskRepo;
    this.agentRunRepo = options.agentRunRepo;
    this.orchestrator = options.orchestrator ?? sandboxOrchestrator;
    this.pipeline = options.pipeline ?? new ArtifactPipeline();
    this.telegramClient = options.telegramClient;
    this.ownerTelegramId =
      options.ownerTelegramId ?? process.env.OWNER_TELEGRAM_ID;
  }

  /**
   * Executes a plan step for a task from intake through verification and completion.
   */
  public async executeTaskStep(
    params: CoordinatorExecutionParams
  ): Promise<ExecutionRunSummary> {
    const startTime = Date.now();
    let runId: string = crypto.randomUUID();

    // 1. Create durable run record in 'queued' status if repository is available
    if (this.agentRunRepo) {
      try {
        const createdRun = await this.agentRunRepo.createRun(
          params.taskId,
          "aider"
        );
        runId = createdRun.id;
      } catch {
        // Fall back to generated runId in standalone/mock mode
      }
    }

    // 2. Transition task and run states to 'running'
    if (this.taskRepo) {
      try {
        await this.taskRepo.updateStatus(params.taskId, "running");
      } catch {
        // Handle gracefully
      }
    }

    if (this.agentRunRepo) {
      try {
        await this.agentRunRepo.startRun(runId);
      } catch {
        // Handle gracefully
      }
    }

    // 3. Synthesize strongly typed CodingTaskContext (locked to 'main')
    const context = synthesizeCodingTaskContext({
      taskId: params.taskId,
      runId,
      step: params.step,
      project: params.project,
      taskContext: params.taskContext,
      acceptanceCriteria: params.acceptanceCriteria,
      env: params.env,
      metadata: params.metadata,
      maxRetries: params.maxRetries ?? 3,
    });

    let executionResult;

    try {
      // 4. Dispatch execution to active sandbox runner (GitHub Actions or local fallback)
      executionResult = await this.orchestrator.execute(context);
    } catch (execError) {
      // Sandbox runner failed catastrophically
      const errorMsg =
        execError instanceof Error ? execError.message : String(execError);

      if (this.agentRunRepo) {
        try {
          await this.agentRunRepo.failRun(runId, errorMsg, 1);
        } catch {
          // ignore
        }
      }

      if (this.taskRepo) {
        try {
          await this.taskRepo.updateStatus(params.taskId, "failed");
        } catch {
          // ignore
        }
      }

      return {
        runId,
        taskId: params.taskId,
        status: "error",
        durationMs: Date.now() - startTime,
        testSummary: { passed: 0, failed: 1, skipped: 0, durationMs: 0 },
        artifactCount: 0,
        errorDetails: errorMsg,
      };
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = executionResult.status === "success";

    // 5. Update durable database records based on outcome
    if (this.agentRunRepo) {
      try {
        if (isSuccess) {
          await this.agentRunRepo.completeRun(runId, {
            exitCode: executionResult.exitCode,
            gitCommitHash: executionResult.commitHash,
            diffPatch: executionResult.diffPatch,
            testResults: executionResult.testSummary,
          });
        } else {
          await this.agentRunRepo.failRun(
            runId,
            executionResult.errorDetails ?? "Execution failed",
            executionResult.exitCode
          );
        }
      } catch {
        // tolerate in test envs
      }
    }

    if (this.taskRepo) {
      try {
        const nextTaskStatus = isSuccess ? "completed" : "failed";
        await this.taskRepo.updateStatus(params.taskId, nextTaskStatus);
      } catch {
        // tolerate in test envs
      }
    }

    // 6. Record and persist artifacts
    await this.pipeline.recordArtifacts(
      runId,
      executionResult.artifacts,
      this.agentRunRepo
    );

    // 7. Dispatch real-time Telegram telemetry notification to owner
    await this.notifyTelegramTelemetry(
      params,
      runId,
      executionResult.status,
      executionResult.commitHash,
      durationMs
    );

    return {
      runId,
      taskId: params.taskId,
      status: executionResult.status,
      commitHash: executionResult.commitHash,
      diffPatch: executionResult.diffPatch,
      durationMs,
      testSummary: executionResult.testSummary,
      artifactCount: executionResult.artifacts.length,
      errorDetails: executionResult.errorDetails,
    };
  }

  /**
   * Dispatches MarkdownV2 telemetry alert to the owner via Telegram.
   */
  private async notifyTelegramTelemetry(
    params: CoordinatorExecutionParams,
    runId: string,
    status: string,
    commitHash?: string,
    durationMs: number = 0
  ): Promise<void> {
    if (!this.telegramClient || !this.ownerTelegramId) {
      return;
    }

    try {
      const isSuccess = status === "success";
      const icon = isSuccess ? "✅" : "❌";
      const shortRunId = escapeMarkdownV2(runId.slice(0, 8));
      const stepTitle = escapeMarkdownV2(params.step.title);
      const projectSlug = escapeMarkdownV2(params.project.slug);
      const durationSec = (durationMs / 1000).toFixed(1);

      let text = `*⚡ Agent Run Update*\n\n` +
        `• *Project:* \`${projectSlug}\`\n` +
        `• *Step:* ${stepTitle}\n` +
        `• *Status:* ${icon} *${escapeMarkdownV2(status.toUpperCase())}*\n` +
        `• *Run ID:* \`${shortRunId}\`\n` +
        `• *Duration:* ${durationSec}s\n`;

      if (commitHash) {
        const shortSha = escapeMarkdownV2(commitHash.slice(0, 7));
        text += `• *Commit:* \`${shortSha}\` \\(main 🔒\\)\n`;
      }

      await this.telegramClient.sendMessage(this.ownerTelegramId, text, {
        parse_mode: "MarkdownV2",
      });
    } catch {
      // Tolerate Telegram delivery error non-fatally
    }
  }
}
