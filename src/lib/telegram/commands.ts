import { escapeMarkdownV2, bold, code, italic } from "./format";
import { BudgetService } from "../ai/ledger";
import { createAdminClient } from "../supabase/admin";
import { GitSyncStatus } from "../github/types";

export interface CommandTask {
  id: string;
  title: string;
  status: string;
}

export interface CommandProject {
  id: string;
  name: string;
  repository_url?: string | null;
}

export interface CommandDependencies {
  fetchTasks?: () => Promise<CommandTask[]>;
  fetchProjects?: () => Promise<CommandProject[]>;
  syncMonitor?: {
    getSyncStatus: () => Promise<GitSyncStatus>;
  };
  budgetService?: {
    getDailySpendInr: (userId: string) => Promise<number>;
    getMonthlySpendInr: (userId: string) => Promise<number>;
  };
  intakeService?: {
    cancelClarification: (userId: string) => Promise<string>;
  };
  decisionService?: {
    handleCliDecision: (
      command: "approve" | "reject",
      targetId: string,
      userId: string,
      reason?: string
    ) => Promise<string>;
  };
  killService?: {
    executeEmergencyStop: (
      userId: string,
      source?: "web" | "telegram" | "api"
    ) => Promise<{
      terminatedProcessesCount: number;
      cancelledRunsCount: number;
      cancelledTasksCount: number;
      revokedApprovalsCount: number;
      durationMs: number;
      subSecondPerformanceAchieved: boolean;
    }>;
  };
  deploymentManager?: {
    getRepository: () => {
      getActiveProductionDeployment: () => Promise<any>;
      getLatestPreviewDeployment: () => Promise<any>;
    };
    requestProductionPromotion: (
      userId: string,
      params: { commitSha: string; commitMessage?: string; notes?: string }
    ) => Promise<{ deployment: any; approval: any }>;
  };
  userId?: string;
}

/**
 * Parses and executes Telegram slash commands (/start, /status, /budget, /projects).
 * Returns a MarkdownV2 formatted response string.
 */
export async function handleTelegramCommand(
  rawText: string,
  deps?: CommandDependencies
): Promise<string> {
  const trimmed = rawText.trim();
  const command = trimmed.split(/\s+/)[0]?.toLowerCase();

  switch (command) {
    case "/start": {
      return [
        `🤖 ${bold("Jarvis AI Command Centre")}`,
        "",
        "Single\\-owner mobile gateway is connected and operational\\.",
        "",
        `${bold("Available Commands:")}`,
        "• /status — Active tasks and execution state",
        "• /budget — Daily and monthly INR expenditure",
        "• /projects — Active projects and repositories",
        "• /approve <id> — Approve pending plan or action",
        "• /reject <id> — Reject pending plan or action",
        "• /cancel — Cancel active task clarification session",
        "• /kill — Emergency Stop: halt all agent workers & cancel tasks",
        "• /deploy [prod] — Multi-environment deployments & promotion",
        "",
        italic("Send any text message to submit a new software task\\."),
      ].join("\n");
    }

    case "/kill": {
      const userId = deps?.userId ?? "00000000-0000-0000-0000-000000000000";
      let result;
      if (deps?.killService) {
        result = await deps.killService.executeEmergencyStop(userId, "telegram");
      } else {
        const { EmergencyKillSwitchService } = await import("../system/kill-switch");
        const { createAdminClient } = await import("../supabase/admin");
        let adminClient;
        try {
          adminClient = createAdminClient();
        } catch {
          // Standalone mode
        }
        const killService = new EmergencyKillSwitchService({ supabase: adminClient });
        result = await killService.executeEmergencyStop(userId, "telegram");
      }

      const perfEmoji = result.subSecondPerformanceAchieved ? "⚡" : "⚠️";
      return [
        `🛑 ${bold("EMERGENCY KILL SWITCH ACTIVATED")}`,
        "",
        "All active automation and background workers have been halted\\.",
        "",
        `${bold("Execution Summary:")}`,
        `• Processes Terminated: ${code(String(result.terminatedProcessesCount))}`,
        `• Agent Runs Cancelled: ${code(String(result.cancelledRunsCount))}`,
        `• Tasks Cancelled: ${code(String(result.cancelledTasksCount))}`,
        `• Approvals Revoked: ${code(String(result.revokedApprovalsCount))}`,
        "",
        `${perfEmoji} ${italic(`Halted in ${result.durationMs} ms (< 1000ms target)`)}`,
      ].join("\n");
    }

    case "/approve": {
      const parts = trimmed.split(/\s+/);
      const targetId = parts[1];
      if (!targetId) {
        return `⚠️ ${bold("Usage:")} ${code("/approve <id>")}\n\nPlease provide the UUID of the plan or approval request\\.`;
      }
      const userId = deps?.userId ?? "00000000-0000-0000-0000-000000000000";
      if (deps?.decisionService) {
        return deps.decisionService.handleCliDecision("approve", targetId, userId);
      }
      const { TelegramDecisionService } = await import("./decision");
      const decisionService = new TelegramDecisionService();
      return decisionService.handleCliDecision("approve", targetId, userId);
    }

    case "/reject": {
      const parts = trimmed.split(/\s+/);
      const targetId = parts[1];
      if (!targetId) {
        return `⚠️ ${bold("Usage:")} ${code("/reject <id> [reason]")}\n\nPlease provide the UUID of the plan or approval request\\.`;
      }
      const reason = parts.slice(2).join(" ").trim() || undefined;
      const userId = deps?.userId ?? "00000000-0000-0000-0000-000000000000";
      if (deps?.decisionService) {
        return deps.decisionService.handleCliDecision("reject", targetId, userId, reason);
      }
      const { TelegramDecisionService } = await import("./decision");
      const decisionService = new TelegramDecisionService();
      return decisionService.handleCliDecision("reject", targetId, userId, reason);
    }

    case "/cancel": {
      const userId = deps?.userId ?? "00000000-0000-0000-0000-000000000000";
      if (deps?.intakeService) {
        return deps.intakeService.cancelClarification(userId);
      }
      const { TelegramIntakeService } = await import("./intake");
      const intakeService = new TelegramIntakeService();
      return intakeService.cancelClarification(userId);
    }

    case "/status": {
      try {
        let items: CommandTask[] = [];

        if (deps?.fetchTasks) {
          items = await deps.fetchTasks();
        } else {
          const supabase = createAdminClient();
          const { data, error } = await supabase
            .from("tasks")
            .select("id, title, status")
            .order("created_at", { ascending: false })
            .limit(10);

          if (error) {
            throw new Error(error.message);
          }
          items = data ?? [];
        }

        let syncInfo: GitSyncStatus | null = null;
        try {
          if (deps?.syncMonitor) {
            syncInfo = await deps.syncMonitor.getSyncStatus();
          } else {
            const { RepoSyncMonitor } = await import("../github/sync-monitor");
            const monitor = new RepoSyncMonitor();
            syncInfo = await monitor.getSyncStatus();
          }
        } catch {
          syncInfo = null;
        }

        const lines: string[] = [`📊 ${bold("Jarvis System Status")}`, ""];

        if (items.length === 0) {
          lines.push("No active tasks in progress\\. System is idle\\.");
        } else {
          lines.push(`${bold("Recent Tasks:")}`);
          const taskLines = items.slice(0, 5).map((t) => {
            const status = escapeMarkdownV2(t.status || "unknown");
            const title = escapeMarkdownV2(t.title || "Untitled Task");
            return `• ${title} \\(${code(status)}\\)`;
          });
          lines.push(...taskLines);
          lines.push("", `Total listed: ${items.length}`);
        }

        if (syncInfo) {
          const syncStatusLabel =
            syncInfo.status === "synced"
              ? "Synced with origin/main"
              : syncInfo.status === "ahead"
              ? `${syncInfo.aheadCount} ahead \\(Push Pending\\)`
              : syncInfo.status === "behind"
              ? `${syncInfo.behindCount} behind \\(Sync Required\\)`
              : escapeMarkdownV2(syncInfo.status);

          lines.push(
            "",
            `🐙 ${bold("Git Sync:")}`,
            `• Branch: ${code(syncInfo.branch)} \\(${syncInfo.isMainLocked ? "🔒 Locked" : "⚠️ Unlocked"}\\)`,
            `• Status: ${syncStatusLabel}`
          );

          if (syncInfo.localShortSha) {
            lines.push(`• HEAD: ${code(syncInfo.localShortSha)}`);
          }
        }

        return lines.join("\n");
      } catch (err) {
        return [
          `⚠️ ${bold("System Status Warning")}`,
          "",
          `Unable to retrieve task status: ${escapeMarkdownV2((err as Error).message)}`,
        ].join("\n");
      }
    }

    case "/budget": {
      try {
        const userId = deps?.userId ?? "00000000-0000-0000-0000-000000000000";
        let budgetService = deps?.budgetService;

        if (!budgetService) {
          const supabase = createAdminClient();
          budgetService = new BudgetService(supabase);
        }

        const [dailySpend, monthlySpend] = await Promise.all([
          budgetService.getDailySpendInr(userId),
          budgetService.getMonthlySpendInr(userId),
        ]);

        const dailyFormatted = escapeMarkdownV2(dailySpend.toFixed(2));
        const monthlyFormatted = escapeMarkdownV2(monthlySpend.toFixed(2));

        return [
          `💰 ${bold("AI Inference Budget")}`,
          "",
          `• ${bold("Today:")} ₹${dailyFormatted} / ₹25\\.00`,
          `• ${bold("This Month:")} ₹${monthlyFormatted} / ₹750\\.00`,
          `• ${bold("Status:")} Normal \\(Strict free\\-tier prioritization\\)`,
        ].join("\n");
      } catch (err) {
        return [
          `⚠️ ${bold("Budget Retrieval Warning")}`,
          "",
          `Unable to calculate spending: ${escapeMarkdownV2((err as Error).message)}`,
        ].join("\n");
      }
    }

    case "/projects": {
      try {
        let items: CommandProject[] = [];

        if (deps?.fetchProjects) {
          items = await deps.fetchProjects();
        } else {
          const supabase = createAdminClient();
          const { data, error } = await supabase
            .from("projects")
            .select("id, name, repository_url")
            .order("created_at", { ascending: false })
            .limit(5);

          if (error) {
            throw new Error(error.message);
          }
          items = data ?? [];
        }

        if (items.length === 0) {
          return [
            `📁 ${bold("Active Projects")}`,
            "",
            "No projects registered yet\\. Create a project in the dashboard to begin\\.",
          ].join("\n");
        }

        let syncInfo: GitSyncStatus | null = null;
        try {
          if (deps?.syncMonitor) {
            syncInfo = await deps.syncMonitor.getSyncStatus();
          } else {
            const { RepoSyncMonitor } = await import("../github/sync-monitor");
            const monitor = new RepoSyncMonitor();
            syncInfo = await monitor.getSyncStatus();
          }
        } catch {
          syncInfo = null;
        }

        const projectLines = items.map((p) => {
          const name = escapeMarkdownV2(p.name || "Untitled Project");
          const repo = p.repository_url ? escapeMarkdownV2(p.repository_url) : "Local";
          const lines = [`• ${bold(name)}`, `  ${italic("Repo:")} ${repo}`];
          if (syncInfo && syncInfo.isMainLocked) {
            lines.push(
              `  ${italic("Branch:")} main \\(🔒\\) • ${escapeMarkdownV2(
                syncInfo.status === "synced"
                  ? "Synced"
                  : syncInfo.status === "ahead"
                  ? `${syncInfo.aheadCount} ahead`
                  : syncInfo.status
              )}`
            );
          }
          return lines.join("\n");
        });

        return [`📁 ${bold("Active Projects")}`, "", ...projectLines].join("\n");
      } catch (err) {
        return [
          `⚠️ ${bold("Project Retrieval Warning")}`,
          "",
          `Unable to retrieve projects: ${escapeMarkdownV2((err as Error).message)}`,
        ].join("\n");
      }
    }

    case "/deploy": {
      const parts = trimmed.split(/\s+/);
      const subCommand = parts[1]?.toLowerCase();
      const userId = deps?.userId ?? "00000000-0000-0000-0000-000000000000";

      let manager = deps?.deploymentManager;
      if (!manager) {
        try {
          const { DeploymentManager } = await import("../deployment/deployment-manager");
          manager = new DeploymentManager();
        } catch {
          // fallback
        }
      }

      if (!manager) {
        return `❌ ${bold("Deployment service is unavailable")}`;
      }

      if (subCommand === "prod" || subCommand === "promote") {
        const commitSha = parts[2];
        let targetSha = commitSha;
        if (!targetSha) {
          const latestPrev = await manager.getRepository().getLatestPreviewDeployment();
          targetSha = latestPrev?.commit_sha;
        }

        if (!targetSha) {
          return [
            `❌ ${bold("Missing Commit SHA")}`,
            "",
            "Please provide a commit SHA to promote to production:",
            `${code("/deploy prod <commit_sha>")}`,
          ].join("\n");
        }

        try {
          const { approval } = await manager.requestProductionPromotion(
            userId,
            {
              commitSha: targetSha,
              commitMessage: `Telegram promotion via /deploy prod`,
              notes: "Dispatched from Telegram gateway",
            }
          );

          return [
            `🚀 ${bold("PRODUCTION PROMOTION DISPATCHED")}`,
            "",
            `🔗 ${bold("Commit:")} ${code(targetSha.substring(0, 7))}`,
            `🛡️ ${bold("Approval ID:")} ${code(approval.id)}`,
            `📊 ${bold("Status:")} ${bold("Pending Owner Approval")}`,
            "",
            "An interactive authorization card has been dispatched to this chat\\.",
            `To approve: ${code(`/approve ${approval.id}`)}`,
          ].join("\n");
        } catch (err: unknown) {
          const e = err as Error;
          return `❌ ${bold("Promotion Request Failed:")} ${escapeMarkdownV2(e.message || "Unknown error")}`;
        }
      }

      // Default: /deploy shows status of production & preview
      const [activeProd, latestPrev] = await Promise.all([
        manager.getRepository().getActiveProductionDeployment(),
        manager.getRepository().getLatestPreviewDeployment(),
      ]);

      const lines: string[] = [
        `🚀 ${bold("Jarvis Deployment Status")}`,
        "",
        `🌐 ${bold("Production Environment:")}`,
      ];

      if (activeProd) {
        lines.push(`• ${bold("Status:")} 🟢 Deployed`);
        lines.push(`• ${bold("URL:")} ${escapeMarkdownV2(activeProd.production_url || "https://jarvis.app")}`);
        lines.push(`• ${bold("Commit:")} ${code(activeProd.commit_sha.substring(0, 7))}`);
        if (activeProd.deployed_at) {
          lines.push(`• ${bold("Deployed:")} ${escapeMarkdownV2(new Date(activeProd.deployed_at).toUTCString())}`);
        }
      } else {
        lines.push("• Status: Not deployed");
      }

      lines.push("");
      lines.push(`🔬 ${bold("Latest Preview Environment:")}`);
      if (latestPrev) {
        lines.push(`• ${bold("Status:")} ${latestPrev.status === "deployed" ? "🟢 Deployed" : escapeMarkdownV2(latestPrev.status)}`);
        lines.push(`• ${bold("URL:")} ${escapeMarkdownV2(latestPrev.preview_url || "N/A")}`);
        lines.push(`• ${bold("Commit:")} ${code(latestPrev.commit_sha.substring(0, 7))}`);
      } else {
        lines.push("• Status: No previews recorded");
      }

      lines.push("");
      lines.push(italic("Use /deploy prod to initiate a production promotion approval request\\."));

      return lines.join("\n");
    }

    default: {
      return [
        `❓ ${bold(`Unknown Command: ${command || "unknown"}`)}`,
        "",
        "Use /start to view available commands, or send a natural language prompt to submit a task\\.",
      ].join("\n");
    }
  }
}
