import type {
  TelegramUpdate,
  TelegramMessage,
  TelegramCallbackQuery,
  InlineKeyboardMarkup,
} from './types.js';
import type { ITelegramClient } from './telegram-client.js';
import type {
  TaskRepository,
  TaskRow,
  ProjectRepository,
  ApprovalRepository,
  BudgetRepository,
  UserRepository,
  AuditRepository,
} from '@jarvis/database';
import type { TaskCoordinator } from '@jarvis/agent-orchestrator';
import type { PermissionEngine } from '@jarvis/permission-engine';
import type { BudgetManager } from '@jarvis/budget-manager';
import { isChatAuthorized } from './auth.js';

export interface CommandRouterDependencies {
  telegramClient: ITelegramClient;
  taskCoordinator: TaskCoordinator;
  permissionEngine: PermissionEngine;
  budgetManager: BudgetManager;
  userRepo: UserRepository;
  projectRepo: ProjectRepository;
  taskRepo: TaskRepository;
  approvalRepo: ApprovalRepository;
  budgetRepo: BudgetRepository;
  auditRepo: AuditRepository;
  authorizedChatId: string;
  defaultUserId: string;
}

export class TelegramCommandRouter {
  constructor(private readonly deps: CommandRouterDependencies) {}

  /**
   * Main entry point for processing incoming Telegram webhook updates.
   */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text?.trim() ?? '';

    // Authorization verification
    if (!isChatAuthorized(chatId, this.deps.authorizedChatId)) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: '⛔ Access Denied: This Telegram account is not authorized to control Jarvis.',
      });
      return;
    }

    if (!text.startsWith('/')) {
      // Natural language task intake shortcut if plain text without slash
      await this.handleTaskCommand(chatId, text);
      return;
    }

    const [rawCommand, ...args] = text.split(' ');
    const command = rawCommand.toLowerCase().split('@')[0]; // Strip bot username if present
    const argumentText = args.join(' ').trim();

    switch (command) {
      case '/start':
        await this.handleStart(chatId);
        break;

      case '/status':
        await this.handleStatus(chatId);
        break;

      case '/task':
        await this.handleTaskCommand(chatId, argumentText);
        break;

      case '/projects':
        await this.handleProjects(chatId);
        break;

      case '/budget':
        await this.handleBudget(chatId);
        break;

      case '/approve':
        await this.handleApprove(chatId, argumentText);
        break;

      case '/reject':
        await this.handleReject(chatId, argumentText);
        break;

      case '/abort':
      case '/kill':
        await this.handleAbort(chatId, argumentText);
        break;

      case '/help':
        await this.handleHelp(chatId);
        break;

      default:
        await this.deps.telegramClient.sendMessage({
          chat_id: chatId,
          text: `❓ Unknown command: \`${command}\`. Type /help for available commands.`,
          parse_mode: 'Markdown',
        });
        break;
    }
  }

  private async handleStart(chatId: number): Promise<void> {
    const welcome =
      `🤖 *Jarvis Autonomous AI Operating System*\n\n` +
      `System initialized and secured.\n` +
      `You are authenticated as the system administrator.\n\n` +
      `Available Commands:\n` +
      `• \`/task <prompt>\` — Submit a new software engineering task\n` +
      `• \`/status\` — View system health, active tasks & pending approvals\n` +
      `• \`/projects\` — List registered software projects\n` +
      `• \`/budget\` — Check daily and monthly inference spending (INR)\n` +
      `• \`/approve <ticket_id>\` — Approve a gated critical action\n` +
      `• \`/reject <ticket_id>\` — Reject a gated action\n` +
      `• \`/abort <task_id>\` — Emergency kill switch to abort execution\n` +
      `• \`/help\` — View command help manual`;

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text: welcome,
      parse_mode: 'Markdown',
    });
  }

  private async handleHelp(chatId: number): Promise<void> {
    await this.handleStart(chatId);
  }

  private async handleStatus(chatId: number): Promise<void> {
    const [tasks, pendingApprovals, budgetStatus] = await Promise.all([
      this.deps.taskRepo.listByUser(this.deps.defaultUserId),
      this.deps.approvalRepo.listPendingByUser(this.deps.defaultUserId),
      this.deps.budgetManager.getSummary(this.deps.defaultUserId),
    ]);

    const activeTasks = tasks.filter(
      (t: TaskRow) => !['COMPLETED', 'CANCELLED', 'EMERGENCY_ABORTED'].includes(t.status)
    );

    let statusText = `📊 *Jarvis System Status*\n\n`;
    statusText += `• *Active Tasks:* ${activeTasks.length}\n`;
    statusText += `• *Pending Approvals:* ${pendingApprovals.length}\n`;
    statusText += `• *Today's Spend:* ₹${budgetStatus.dailySpendInr.toFixed(2)} / ₹${budgetStatus.dailyLimitInr.toFixed(2)}\n`;
    statusText += `• *Month Spend:* ₹${budgetStatus.monthlySpendInr.toFixed(2)} / ₹${budgetStatus.monthlyLimitInr.toFixed(2)}\n\n`;

    if (activeTasks.length > 0) {
      statusText += `*Active Tasks:*\n`;
      for (const t of activeTasks.slice(0, 5)) {
        statusText += `• \`#${t.id.slice(0, 8)}\` [${t.status}] — *${t.title}*\n`;
      }
      if (activeTasks.length > 5) {
        statusText += `_...and ${activeTasks.length - 5} more._\n`;
      }
    } else {
      statusText += `_No running tasks._\n`;
    }

    if (pendingApprovals.length > 0) {
      statusText += `\n⚠️ *Pending Approvals Requiring Action:*\n`;
      for (const a of pendingApprovals.slice(0, 3)) {
        statusText += `• \`/approve ${a.id.slice(0, 8)}\` — *${a.action_type}*\n`;
      }
    }

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text: statusText,
      parse_mode: 'Markdown',
    });
  }

  private async handleTaskCommand(chatId: number, promptText: string): Promise<void> {
    if (!promptText) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: '⚠️ Please provide a task description. Example:\n`/task Add OAuth login with GitHub`',
        parse_mode: 'Markdown',
      });
      return;
    }

    // Resolve or find first project
    const projects = await this.deps.projectRepo.listByUser(this.deps.defaultUserId);
    if (projects.length === 0) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: '❌ No active projects found. Please create a project via the Web Dashboard first.',
      });
      return;
    }

    const targetProject = projects[0];
    const taskTitle = promptText.length > 60 ? `${promptText.slice(0, 57)}...` : promptText;

    const task = await this.deps.taskCoordinator.createTask(
      {
        projectId: targetProject.id,
        title: taskTitle,
        promptRaw: promptText,
        priority: 'MEDIUM',
      },
      this.deps.defaultUserId
    );

    const confirmation =
      `✅ *Task Created & Enqueued*\n\n` +
      `• *ID:* \`${task.id}\`\n` +
      `• *Project:* ${targetProject.name}\n` +
      `• *Status:* \`${task.status}\`\n` +
      `• *Prompt:* ${promptText}\n\n` +
      `Jarvis will now prepare specification and milestone plans.`;

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text: confirmation,
      parse_mode: 'Markdown',
    });
  }

  private async handleProjects(chatId: number): Promise<void> {
    const projects = await this.deps.projectRepo.listByUser(this.deps.defaultUserId);
    if (projects.length === 0) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: '📁 No registered projects. Register one via Web Dashboard.',
      });
      return;
    }

    let text = `📁 *Registered Projects (${projects.length}):*\n\n`;
    for (const p of projects) {
      text += `• *${p.name}* (\`${p.slug}\`)\n`;
      if (p.github_repo_full_name) text += `  Repo: ${p.github_repo_full_name}\n`;
      text += `  Branch: \`${p.default_branch}\`\n\n`;
    }

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });
  }

  private async handleBudget(chatId: number): Promise<void> {
    const status = await this.deps.budgetManager.getSummary(this.deps.defaultUserId);
    const dailyRemaining = Math.max(0, status.dailyLimitInr - status.dailySpendInr);
    const monthlyRemaining = Math.max(0, status.monthlyLimitInr - status.monthlySpendInr);

    const text =
      `💰 *Jarvis Financial & Budget Controls*\n\n` +
      `• *Daily Spend:* ₹${status.dailySpendInr.toFixed(2)} / ₹${status.dailyLimitInr.toFixed(2)}\n` +
      `• *Daily Remaining:* ₹${dailyRemaining.toFixed(2)}\n` +
      `• *Monthly Spend:* ₹${status.monthlySpendInr.toFixed(2)} / ₹${status.monthlyLimitInr.toFixed(2)}\n` +
      `• *Monthly Remaining:* ₹${monthlyRemaining.toFixed(2)}\n` +
      `• *Emergency Reserve Cap:* ₹${status.emergencyReserveInr.toFixed(2)}\n` +
      `• *Emergency Reserve Approved:* ${status.emergencyReserveApproved ? '✅ Yes' : '🔒 No'}\n\n` +
      `_Paid AI inference is gated by default. Free tier models are utilized whenever available._`;

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });
  }

  private async handleApprove(chatId: number, ticketArg: string): Promise<void> {
    if (!ticketArg) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: '⚠️ Please specify approval ticket ID. Example: `/approve <id>`',
        parse_mode: 'Markdown',
      });
      return;
    }

    const ticketId = await this.resolveTicketId(ticketArg);
    if (!ticketId) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: `❌ Approval ticket matching \`${ticketArg}\` not found.`,
        parse_mode: 'Markdown',
      });
      return;
    }

    await this.deps.permissionEngine.resolveApproval(
      ticketId,
      this.deps.defaultUserId,
      'APPROVED',
      'Approved via Telegram command'
    );

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text: `✅ Approval ticket \`${ticketId}\` has been *APPROVED*. Execution will proceed.`,
      parse_mode: 'Markdown',
    });
  }

  private async handleReject(chatId: number, ticketArg: string): Promise<void> {
    if (!ticketArg) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: '⚠️ Please specify approval ticket ID. Example: `/reject <id>`',
        parse_mode: 'Markdown',
      });
      return;
    }

    const ticketId = await this.resolveTicketId(ticketArg);
    if (!ticketId) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: `❌ Approval ticket matching \`${ticketArg}\` not found.`,
        parse_mode: 'Markdown',
      });
      return;
    }

    await this.deps.permissionEngine.resolveApproval(
      ticketId,
      this.deps.defaultUserId,
      'REJECTED',
      'Rejected via Telegram command'
    );

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text: `🛑 Approval ticket \`${ticketId}\` has been *REJECTED*. Action blocked.`,
      parse_mode: 'Markdown',
    });
  }

  private async handleAbort(chatId: number, taskArg: string): Promise<void> {
    if (!taskArg) {
      // Abort all running tasks
      const tasks = await this.deps.taskRepo.listByUser(this.deps.defaultUserId);
      const active = tasks.filter((t: TaskRow) =>
        ['INTAKE', 'SPECIFYING', 'PLANNING', 'DISPATCHED', 'RUNNING', 'TESTING', 'SELF_HEALING'].includes(
          t.status
        )
      );

      if (active.length === 0) {
        await this.deps.telegramClient.sendMessage({
          chat_id: chatId,
          text: 'ℹ️ No active tasks to abort.',
        });
        return;
      }

      for (const t of active) {
        await this.deps.taskCoordinator.cancelTask(
          t.id,
          this.deps.defaultUserId,
          'Emergency abort triggered via Telegram'
        );
      }

      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: `🚨 *EMERGENCY KILL SWITCH ACTIVATED*\nAborted ${active.length} active tasks immediately.`,
        parse_mode: 'Markdown',
      });
      return;
    }

    const taskId = await this.resolveTaskId(taskArg);
    if (!taskId) {
      await this.deps.telegramClient.sendMessage({
        chat_id: chatId,
        text: `❌ Task matching \`${taskArg}\` not found.`,
        parse_mode: 'Markdown',
      });
      return;
    }

    await this.deps.taskCoordinator.cancelTask(
      taskId,
      this.deps.defaultUserId,
      'Cancelled via Telegram command'
    );

    await this.deps.telegramClient.sendMessage({
      chat_id: chatId,
      text: `🛑 Task \`${taskId}\` has been aborted/cancelled.`,
      parse_mode: 'Markdown',
    });
  }

  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const data = query.data ?? '';
    const queryId = query.id;
    const message = query.message;

    if (!data) return;

    const [action, targetId] = data.split(':');

    if (action === 'approve') {
      await this.deps.permissionEngine.resolveApproval(
        targetId,
        this.deps.defaultUserId,
        'APPROVED',
        'Approved via 1-click Telegram button'
      );

      await this.deps.telegramClient.answerCallbackQuery({
        callback_query_id: queryId,
        text: 'Action Approved!',
      });

      if (message) {
        await this.deps.telegramClient.editMessageText({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: `${message.text ?? ''}\n\n✅ *APPROVED by operator.*`,
          parse_mode: 'Markdown',
        });
      }
    } else if (action === 'reject') {
      await this.deps.permissionEngine.resolveApproval(
        targetId,
        this.deps.defaultUserId,
        'REJECTED',
        'Rejected via 1-click Telegram button'
      );

      await this.deps.telegramClient.answerCallbackQuery({
        callback_query_id: queryId,
        text: 'Action Rejected!',
      });

      if (message) {
        await this.deps.telegramClient.editMessageText({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: `${message.text ?? ''}\n\n🛑 *REJECTED by operator.*`,
          parse_mode: 'Markdown',
        });
      }
    }
  }

  /**
   * Helper to send an interactive approval notification to the admin via Telegram.
   */
  async sendApprovalRequestAlert(ticket: {
    id: string;
    actionType: string;
    riskLevel: string;
    details: string;
  }): Promise<TelegramMessage> {
    const text =
      `⚠️ *Action Approval Required*\n\n` +
      `• *Ticket ID:* \`${ticket.id}\`\n` +
      `• *Action:* *${ticket.actionType}*\n` +
      `• *Risk Level:* \`${ticket.riskLevel}\`\n` +
      `• *Details:* ${ticket.details}\n\n` +
      `Do you authorize Jarvis to proceed?`;

    const markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${ticket.id}` },
          { text: '🛑 Reject', callback_data: `reject:${ticket.id}` },
        ],
      ],
    };

    return this.deps.telegramClient.sendMessage({
      chat_id: this.deps.authorizedChatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: markup,
    });
  }

  private async resolveTicketId(prefix: string): Promise<string | null> {
    const pending = await this.deps.approvalRepo.listPendingByUser(this.deps.defaultUserId);
    const found = pending.find((p) => p.id.startsWith(prefix) || p.id === prefix);
    return found ? found.id : null;
  }

  private async resolveTaskId(prefix: string): Promise<string | null> {
    const tasks = await this.deps.taskRepo.listByUser(this.deps.defaultUserId);
    const found = tasks.find((t) => t.id.startsWith(prefix) || t.id === prefix);
    return found ? found.id : null;
  }
}
