import { SpecifierAgent } from "../agents/specifier/specifier-agent";
import {
  ClarificationAnswer,
  ClarificationQuestion,
  SpecificationPayload,
} from "../agents/specifier/types";
import { createDefaultAIGateway } from "../ai/gateway";
import { TaskRepository } from "../repositories/task-repository";
import { SpecificationRepository } from "../repositories/specification-repository";
import { ConversationRepository } from "../repositories/conversation-repository";
import { ProjectRepository } from "../repositories/project-repository";
import { TelegramClient } from "./client";
import { escapeMarkdownV2, bold, italic } from "./format";
import { createAdminClient } from "../supabase/admin";

export interface ActiveClarificationSession {
  conversationId: string;
  taskId: string;
  originalPrompt: string;
  questions: ClarificationQuestion[];
  round: number;
}

export interface IntakeDependencies {
  specifierAgent?: SpecifierAgent;
  taskRepo?: TaskRepository;
  specRepo?: SpecificationRepository;
  convRepo?: ConversationRepository;
  projectRepo?: ProjectRepository;
  client?: TelegramClient;
}

interface TelegramConversationMetadata {
  taskId?: string;
  originalPrompt?: string;
  questions?: ClarificationQuestion[];
  round?: number;
  awaitingClarification?: boolean;
  completed?: boolean;
  cancelled?: boolean;
}

export class TelegramIntakeService {
  private readonly specifierAgent: SpecifierAgent;
  private readonly taskRepo?: TaskRepository;
  private readonly specRepo?: SpecificationRepository;
  private readonly convRepo?: ConversationRepository;
  private readonly projectRepo?: ProjectRepository;
  private readonly client: TelegramClient;

  constructor(deps?: IntakeDependencies) {
    this.specifierAgent =
      deps?.specifierAgent ?? new SpecifierAgent(createDefaultAIGateway());
    this.taskRepo = deps?.taskRepo;
    this.specRepo = deps?.specRepo;
    this.convRepo = deps?.convRepo;
    this.projectRepo = deps?.projectRepo;
    this.client = deps?.client ?? new TelegramClient();
  }

  private getRepositories() {
    if (this.taskRepo && this.specRepo && this.convRepo && this.projectRepo) {
      return {
        taskRepo: this.taskRepo,
        specRepo: this.specRepo,
        convRepo: this.convRepo,
        projectRepo: this.projectRepo,
      };
    }

    const supabase = createAdminClient();
    return {
      taskRepo: this.taskRepo ?? new TaskRepository(supabase),
      specRepo: this.specRepo ?? new SpecificationRepository(supabase),
      convRepo: this.convRepo ?? new ConversationRepository(supabase),
      projectRepo: this.projectRepo ?? new ProjectRepository(supabase),
    };
  }

  /**
   * Resolves the primary project for the owner, creating a default one if none exists.
   */
  public async resolveActiveProject(userId: string): Promise<string> {
    const { projectRepo } = this.getRepositories();
    const result = await projectRepo.list(userId, { limit: 1 });

    const firstItem = result.data?.[0];
    if (firstItem) {
      return firstItem.id;
    }

    const newProject = await projectRepo.create(userId, {
      name: "Personal Workspace",
      description: "Default workspace for Jarvis autonomous development.",
      defaultBranch: "main",
    });

    return newProject.id;
  }

  /**
   * Evaluates a new natural language task prompt from Telegram, initiates specification,
   * and returns an appropriate MarkdownV2 response (questions or confirmation).
   */
  public async handleNewTaskPrompt(
    userId: string,
    prompt: string
  ): Promise<string> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return "⚠️ Prompt cannot be empty\\. Please describe the task you would like Jarvis to perform\\.";
    }

    const { taskRepo, specRepo, convRepo } = this.getRepositories();

    try {
      const projectId = await this.resolveActiveProject(userId);

      // Generate concise title from first sentence / 80 chars
      const firstLine = trimmed.split("\n")[0]?.trim() || trimmed;
      const title = firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;

      const task = await taskRepo.create(projectId, {
        title,
        description: trimmed,
        priority: "medium",
        riskLevel: "low",
      });

      const response = await this.specifierAgent.specify({
        rawPrompt: trimmed,
        projectId,
        userId,
      });

      if (response.status === "needs_clarification") {
        await convRepo.createConversation(userId, {
          projectId,
          title: `Telegram Clarification: ${task.title}`,
          channel: "telegram",
          metadata: {
            taskId: task.id,
            awaitingClarification: true,
            originalPrompt: trimmed,
            questions: response.questions,
            round: 1,
          },
        });

        const questionLines = response.questions.map((q, idx) => {
          return `${idx + 1}\\. ${escapeMarkdownV2(q.question)}`;
        });

        const ambiguityFormatted = escapeMarkdownV2(response.ambiguity.score.toFixed(2));

        return [
          `🔍 ${bold("Clarification Needed")}`,
          "",
          `*Task:* ${escapeMarkdownV2(task.title)}`,
          `*Ambiguity Score:* ${ambiguityFormatted} \\(Threshold: 0\\.35\\)`,
          "",
          bold("Please answer the following:"),
          ...questionLines,
          "",
          italic("Reply directly with your answer, or send /cancel to abort\\."),
        ].join("\n");
      }

      // Ambiguity <= 0.35: Specification is complete
      const spec = response.specification as SpecificationPayload;
      await specRepo.create({
        taskId: task.id,
        scope: spec.scope,
        exclusions: spec.exclusions,
        acceptanceCriteria: spec.acceptanceCriteria,
        rawUserPrompt: trimmed,
        version: 1,
      });

      const criteriaCount = spec.acceptanceCriteria ? spec.acceptanceCriteria.length : 0;
      const scopeSummary = escapeMarkdownV2(
        spec.scope.length > 120 ? spec.scope.slice(0, 117) + "..." : spec.scope
      );

      return [
        `✅ ${bold("Specification Formulated")}`,
        "",
        `*Task:* ${escapeMarkdownV2(task.title)}`,
        `*Scope:* ${scopeSummary}`,
        `*Criteria Defined:* ${criteriaCount} testable criteria`,
        "",
        italic("Ready for planning\\. View in web dashboard to inspect and approve\\."),
      ].join("\n");
    } catch (err) {
      return [
        `⚠️ ${bold("Specification Error")}`,
        "",
        `Unable to formulate specification: ${escapeMarkdownV2((err as Error).message)}`,
      ].join("\n");
    }
  }

  /**
   * Retrieves an active conversation waiting for clarification answers, if any.
   */
  public async getActiveClarificationSession(
    userId: string
  ): Promise<ActiveClarificationSession | null> {
    const { convRepo } = this.getRepositories();
    const result = await convRepo.listConversations(userId, { limit: 10 });

    const activeConv = (result.data || []).find((c) => {
      const meta = c.metadata as Record<string, unknown> | null;
      return (
        c.channel === "telegram" &&
        c.status === "active" &&
        meta?.awaitingClarification === true
      );
    });

    if (!activeConv || !activeConv.metadata) {
      return null;
    }

    const meta = activeConv.metadata as unknown as TelegramConversationMetadata;
    return {
      conversationId: activeConv.id,
      taskId: meta.taskId || "",
      originalPrompt: meta.originalPrompt || "",
      questions: meta.questions || [],
      round: Number(meta.round || 1),
    };
  }

  /**
   * Handles user's answer to pending clarification questions.
   */
  public async handleClarificationAnswer(
    userId: string,
    answerText: string
  ): Promise<string> {
    const session = await this.getActiveClarificationSession(userId);
    if (!session) {
      return "⚠️ No pending clarification session found\\. Send a new task prompt to begin\\.";
    }

    const trimmed = answerText.trim();
    if (!trimmed) {
      return "⚠️ Answer cannot be empty\\. Please provide clarification details\\.";
    }

    const { specRepo, convRepo } = this.getRepositories();

    try {
      // Map answer to question items
      const answers: ClarificationAnswer[] = [];
      if (session.questions.length > 0) {
        session.questions.forEach((q, idx) => {
          answers.push({
            questionId: q.id || `q_${idx + 1}`,
            question: q.question,
            answer: trimmed,
          });
        });
      } else {
        answers.push({
          questionId: "general",
          question: "Clarification request",
          answer: trimmed,
        });
      }

      const response = await this.specifierAgent.specifyWithClarifications(
        {
          rawPrompt: session.originalPrompt,
          userId,
        },
        answers
      );

      if (response.status === "needs_clarification" && session.round < 3) {
        await convRepo.updateMetadata(session.conversationId, userId, {
          taskId: session.taskId,
          awaitingClarification: true,
          originalPrompt: session.originalPrompt,
          questions: response.questions,
          round: session.round + 1,
        });

        const questionLines = response.questions.map((q, idx) => {
          return `${idx + 1}\\. ${escapeMarkdownV2(q.question)}`;
        });

        return [
          `🔍 ${bold(`Clarification Needed (Round ${session.round + 1})`)}`,
          "",
          bold("Remaining questions:"),
          ...questionLines,
          "",
          italic("Reply with your answers, or send /cancel to abort\\."),
        ].join("\n");
      }

      // Ambiguity resolved or max rounds reached
      if (response.status === "specified") {
        const spec = response.specification;
        await specRepo.create({
          taskId: session.taskId,
          scope: spec.scope,
          exclusions: spec.exclusions,
          acceptanceCriteria: spec.acceptanceCriteria,
          rawUserPrompt: session.originalPrompt,
          version: 1,
        });

        await convRepo.updateMetadata(session.conversationId, userId, {
          taskId: session.taskId,
          awaitingClarification: false,
          completed: true,
          finalRound: session.round,
        });

        const criteriaCount = spec.acceptanceCriteria ? spec.acceptanceCriteria.length : 0;
        const scopeSummary = escapeMarkdownV2(
          spec.scope.length > 120 ? spec.scope.slice(0, 117) + "..." : spec.scope
        );

        return [
          `✅ ${bold("Specification Formulated")}`,
          "",
          `*Scope:* ${scopeSummary}`,
          `*Criteria Defined:* ${criteriaCount} testable criteria`,
          "",
          italic("Ready for planning\\. View in web dashboard to inspect and approve\\."),
        ].join("\n");
      }

      // Fallback if max round reached but still needs clarification
      return [
        `⚠️ ${bold("Clarification Incomplete")}`,
        "",
        "Specification could not be fully resolved after 3 rounds\\. Please refine your prompt and try again, or create the task directly in the web dashboard\\.",
      ].join("\n");
    } catch (err) {
      return [
        `⚠️ ${bold("Clarification Error")}`,
        "",
        `Unable to process clarification answer: ${escapeMarkdownV2((err as Error).message)}`,
      ].join("\n");
    }
  }

  /**
   * Cancels any active clarification session for the user.
   */
  public async cancelClarification(userId: string): Promise<string> {
    const session = await this.getActiveClarificationSession(userId);
    if (!session) {
      return "ℹ️ No active clarification session to cancel\\.";
    }

    const { convRepo } = this.getRepositories();
    await convRepo.updateMetadata(session.conversationId, userId, {
      taskId: session.taskId,
      awaitingClarification: false,
      cancelled: true,
    });

    return [
      `🚫 ${bold("Clarification Cancelled")}`,
      "",
      "Active task specification session has been aborted\\. You can submit a new prompt anytime\\.",
    ].join("\n");
  }
}
