import { escapeMarkdownV2, bold, code, italic } from "./format";
import { BudgetService } from "../ai/ledger";
import { createAdminClient } from "../supabase/admin";

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
  budgetService?: {
    getDailySpendInr: (userId: string) => Promise<number>;
    getMonthlySpendInr: (userId: string) => Promise<number>;
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
        "",
        italic("Send any text message to submit a new software task\\."),
      ].join("\n");
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

        if (items.length === 0) {
          return [
            `📊 ${bold("Jarvis System Status")}`,
            "",
            "No active tasks in progress\\. System is idle\\.",
          ].join("\n");
        }

        const taskLines = items.slice(0, 5).map((t) => {
          const status = escapeMarkdownV2(t.status || "unknown");
          const title = escapeMarkdownV2(t.title || "Untitled Task");
          return `• ${title} \\(${code(status)}\\)`;
        });

        return [
          `📊 ${bold("Jarvis System Status")}`,
          "",
          `${bold("Recent Tasks:")}`,
          ...taskLines,
          "",
          `Total listed: ${items.length}`,
        ].join("\n");
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

        const projectLines = items.map((p) => {
          const name = escapeMarkdownV2(p.name || "Untitled Project");
          const repo = p.repository_url ? escapeMarkdownV2(p.repository_url) : "Local";
          return `• ${bold(name)}\n  ${italic("Repo:")} ${repo}`;
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

    default: {
      return [
        `❓ ${bold(`Unknown Command: ${command || "unknown"}`)}`,
        "",
        "Use /start to view available commands, or send a natural language prompt to submit a task\\.",
      ].join("\n");
    }
  }
}
