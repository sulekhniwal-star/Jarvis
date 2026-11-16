import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { parseUnifiedDiff } from "@/lib/agents/engine/verification/diff-inspector/diff-parser";
import { scoreDiffQuality } from "@/lib/agents/engine/verification/diff-inspector/quality-scorer";
import { RunArtifact } from "@/types/database";
import { DiffViolation } from "@/lib/agents/engine/verification/diff-inspector/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "RUN_ID_REQUIRED", message: "Run ID parameter is missing" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const agentRunRepo = new AgentRunRepository(adminClient);
    const taskRepo = new TaskRepository(adminClient);
    const projectRepo = new ProjectRepository(adminClient);

    const run = await agentRunRepo.getById(id);
    if (!run) {
      return NextResponse.json(
        { error: "RUN_NOT_FOUND", message: `Agent run with ID '${id}' was not found` },
        { status: 404 }
      );
    }

    // Fetch linked task if available
    let task = null;
    let project = null;

    if (run.task_id) {
      try {
        task = await taskRepo.getById(run.task_id);
        if (task && task.project_id) {
          try {
            project = await projectRepo.getById(
              task.project_id,
              "00000000-0000-0000-0000-000000000001"
            );
          } catch {
            // Ignore project fetch error
          }
        }
      } catch {
        // Ignore task fetch error
      }
    }

    // Fetch attached artifacts
    let artifacts: RunArtifact[] = [];
    try {
      artifacts = await agentRunRepo.listArtifacts(id);
    } catch {
      artifacts = [];
    }

    // Parse git diff patch if present
    let diffSummary = {
      additions: 0,
      deletions: 0,
      filesCount: 0,
      modifiedFiles: [] as string[],
      riskTier: "low",
      violations: [] as DiffViolation[],
      rawPatch: run.diff_patch || null,
    };

    if (run.diff_patch) {
      try {
        const parsedFiles = parseUnifiedDiff(run.diff_patch);
        const { metrics, violations } = scoreDiffQuality(parsedFiles);

        diffSummary = {
          additions: metrics.additions,
          deletions: metrics.deletions,
          filesCount: metrics.filesCount,
          modifiedFiles: parsedFiles.map((f) => f.newPath || f.oldPath || "unknown"),
          riskTier: metrics.riskTier,
          violations,
          rawPatch: run.diff_patch,
        };
      } catch {
        // Fallback if parsing fails
      }
    }

    return NextResponse.json(
      {
        run,
        task,
        project,
        artifacts,
        diffSummary,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.message?.includes("not found")) {
      return NextResponse.json(
        { error: "RUN_NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error?.message || "Failed to fetch run telemetry" },
      { status: 500 }
    );
  }
}
