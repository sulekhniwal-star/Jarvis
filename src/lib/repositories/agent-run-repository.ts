import { BaseRepository } from "./base";
import { AgentRun, RunArtifact, ArtifactType } from "@/types/database";
import { AgentRunStateMachine } from "../state-machines/run-state-machine";

export interface CompleteRunDTO {
  exitCode?: number;
  diffPatch?: string;
  gitCommitHash?: string;
  testResults?: Record<string, unknown>;
}

export interface CreateArtifactDTO {
  artifactType: ArtifactType;
  storagePath: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
}

export class AgentRunRepository extends BaseRepository {
  public async createRun(
    taskId: string,
    agentEngine: string = "aider"
  ): Promise<AgentRun> {
    try {
      const { data: run, error } = await this.client
        .from("agent_runs")
        .insert({
          task_id: taskId,
          agent_engine: agentEngine,
          status: "queued",
          retry_count: 0,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create agent run for task '${taskId}'`);
      }

      return run;
    } catch (err) {
      this.handleError(err, `Failed to create agent run for task '${taskId}'`);
    }
  }

  public async getById(runId: string): Promise<AgentRun> {
    try {
      const { data, error } = await this.client
        .from("agent_runs")
        .select()
        .eq("id", runId)
        .single();

      if (error) {
        this.handleError(error, `Agent run not found with id '${runId}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Agent run not found with id '${runId}'`);
    }
  }

  public async startRun(runId: string, gitHeadBefore?: string): Promise<AgentRun> {
    const existing = await this.getById(runId);
    AgentRunStateMachine.assertTransition(existing.status, "running", existing.retry_count);

    try {
      const { data: updated, error } = await this.client
        .from("agent_runs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          git_head_before: gitHeadBefore ?? null,
        })
        .eq("id", runId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to start agent run '${runId}'`);
      }

      return updated;
    } catch (err) {
      this.handleError(err, `Failed to start agent run '${runId}'`);
    }
  }

  public async completeRun(
    runId: string,
    data: CompleteRunDTO = {}
  ): Promise<AgentRun> {
    const existing = await this.getById(runId);
    AgentRunStateMachine.assertTransition(existing.status, "completed", existing.retry_count);

    try {
      const { data: updated, error } = await this.client
        .from("agent_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          exit_code: data.exitCode ?? 0,
          diff_patch: data.diffPatch ?? null,
          git_commit_hash: data.gitCommitHash ?? null,
          test_results: data.testResults ?? {},
        })
        .eq("id", runId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to complete agent run '${runId}'`);
      }

      return updated;
    } catch (err) {
      this.handleError(err, `Failed to complete agent run '${runId}'`);
    }
  }

  public async failRun(
    runId: string,
    errorSummary: string,
    exitCode: number = 1
  ): Promise<AgentRun> {
    const existing = await this.getById(runId);
    AgentRunStateMachine.assertTransition(existing.status, "failed", existing.retry_count);

    try {
      const { data: updated, error } = await this.client
        .from("agent_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_summary: errorSummary,
          exit_code: exitCode,
          retry_count: existing.retry_count + 1,
        })
        .eq("id", runId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to fail agent run '${runId}'`);
      }

      return updated;
    } catch (err) {
      this.handleError(err, `Failed to fail agent run '${runId}'`);
    }
  }

  public async addArtifact(
    runId: string,
    data: CreateArtifactDTO
  ): Promise<RunArtifact> {
    try {
      const { data: artifact, error } = await this.client
        .from("run_artifacts")
        .insert({
          run_id: runId,
          artifact_type: data.artifactType,
          storage_path: data.storagePath,
          file_size_bytes: data.fileSizeBytes,
          mime_type: data.mimeType,
          checksum_sha256: data.checksumSha256,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to attach artifact to run '${runId}'`);
      }

      return artifact;
    } catch (err) {
      this.handleError(err, `Failed to attach artifact to run '${runId}'`);
    }
  }

  public async recordArtifact(
    runId: string,
    data: CreateArtifactDTO
  ): Promise<RunArtifact> {
    return this.addArtifact(runId, data);
  }

  public async listRecentRuns(limit: number = 20): Promise<AgentRun[]> {
    try {
      const { data, error } = await this.client
        .from("agent_runs")
        .select()
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        this.handleError(error, "Failed to list recent agent runs");
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, "Failed to list recent agent runs");
    }
  }

  public async listArtifacts(runId: string): Promise<RunArtifact[]> {
    try {
      const { data, error } = await this.client
        .from("run_artifacts")
        .select()
        .eq("run_id", runId)
        .order("created_at", { ascending: true });

      if (error) {
        this.handleError(error, `Failed to list artifacts for run '${runId}'`);
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, `Failed to list artifacts for run '${runId}'`);
    }
  }

  public async listRunsByTask(taskId: string): Promise<AgentRun[]> {
    try {
      const { data, error } = await this.client
        .from("agent_runs")
        .select()
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) {
        this.handleError(error, `Failed to list runs for task '${taskId}'`);
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, `Failed to list runs for task '${taskId}'`);
    }
  }
}
