import * as crypto from "crypto";
import { ExecutionArtifact, CodingTaskResult, CodingTaskContext } from "../types";
import { AgentRunRepository, CreateArtifactDTO } from "@/lib/repositories/agent-run-repository";
import { RunArtifact } from "@/types/database";

const SECRET_PATTERNS = [
  /(?:SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|POSTGRES_PASSWORD|TELEGRAM_BOT_TOKEN|GITHUB_WEBHOOK_SECRET)[=:]\s*([^\s"']+)/gi,
  /(?:password|secret|token|api_key|apikey)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{12,})["']?/gi,
];

/**
 * ArtifactPipeline handles hashing, sanitizing, and persisting execution artifacts
 * and generating human-readable execution summaries (REQ-EX-04, NFR-SEC-02).
 */
export class ArtifactPipeline {
  /**
   * Computes SHA-256 checksum for artifact content.
   */
  public computeSha256(content: string | Buffer): string {
    const hash = crypto.createHash("sha256");
    if (typeof content === "string") {
      hash.update(content, "utf8");
    } else {
      hash.update(content);
    }
    return hash.digest("hex");
  }

  /**
   * Sanitizes text content to prevent accidental leakage of master credentials.
   */
  public sanitizeContent(content: string): string {
    let sanitized = content;
    for (const pattern of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match, captured) => {
        if (captured) {
          return match.replace(captured, "[REDACTED_SECRET]");
        }
        return "[REDACTED_SECRET]";
      });
    }
    return sanitized;
  }

  /**
   * Hashes and persists all execution artifacts via the AgentRunRepository.
   */
  public async recordArtifacts(
    runId: string,
    artifacts: ExecutionArtifact[],
    runRepo?: AgentRunRepository
  ): Promise<RunArtifact[]> {
    if (!runRepo || artifacts.length === 0) {
      return [];
    }

    const recorded: RunArtifact[] = [];

    for (const artifact of artifacts) {
      const rawContent = artifact.content;
      const contentStr =
        typeof rawContent === "string"
          ? this.sanitizeContent(rawContent)
          : rawContent;

      const checksumSha256 = this.computeSha256(contentStr);
      const fileSizeBytes =
        typeof contentStr === "string"
          ? Buffer.byteLength(contentStr, "utf8")
          : contentStr.length;

      let dbArtifactType: import("@/types/database").ArtifactType = "diff";
      if (
        artifact.artifactType === "test_log" ||
        artifact.artifactType === "build_log" ||
        artifact.artifactType === "screenshot" ||
        artifact.artifactType === "diff"
      ) {
        dbArtifactType = artifact.artifactType;
      } else if (artifact.artifactType === "patch") {
        dbArtifactType = "diff";
      }

      const dto: CreateArtifactDTO = {
        artifactType: dbArtifactType,
        storagePath: artifact.path || `runs/${runId}/${artifact.name}`,
        fileSizeBytes,
        mimeType: artifact.mimeType,
        checksumSha256,
      };

      try {
        const item = await runRepo.recordArtifact(runId, dto);
        recorded.push(item);
      } catch {
        // Silently tolerate storage logging failure in non-db test environments
      }
    }

    return recorded;
  }

  /**
   * Compiles Markdown execution summary for the completed task.
   */
  public generateSummaryMarkdown(
    result: CodingTaskResult,
    context: CodingTaskContext
  ): string {
    const statusEmoji = result.status === "success" ? "✅" : "❌";
    const lines: string[] = [];

    lines.push(`# ${statusEmoji} Task Execution Summary`);
    lines.push(`- **Task ID:** \`${context.taskId}\``);
    lines.push(`- **Run ID:** \`${result.runId}\``);
    lines.push(`- **Project:** \`${context.projectSlug}\``);
    lines.push(`- **Status:** **${result.status.toUpperCase()}** (Exit Code: \`${result.exitCode}\`)`);

    if (result.commitHash) {
      lines.push(`- **Commit SHA:** \`${result.commitHash}\` (main 🔒)`);
    }

    lines.push(`- **Tests:** ${result.testSummary.passed} passed, ${result.testSummary.failed} failed (${result.testSummary.durationMs}ms)`);
    lines.push(`- **Artifacts:** ${result.artifacts.length} generated`);

    if (result.errorDetails) {
      lines.push(`\n## Error Details\n\`\`\`\n${result.errorDetails}\n\`\`\``);
    }

    if (result.diffPatch) {
      lines.push(`\n## Diff Patch\n\`\`\`diff\n${result.diffPatch}\n\`\`\``);
    }

    return lines.join("\n");
  }
}
