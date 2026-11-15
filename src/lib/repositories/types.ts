import type {
  Project,
  ProjectStatus,
  Milestone,
  MilestoneStatus,
  Task,
  TaskPriority,
  TaskRiskLevel,
  TaskStatus,
  Conversation,
  ConversationChannel,
  ConversationStatus,
  Message,
  MessageSenderType,
  Approval,
  ApprovalActionType,
  ApprovalStatus,
  AgentRun,
  AgentRunStatus,
  RunArtifact,
  ArtifactType,
  CostRecord,
  AuditEvent,
  Memory,
  MemoryCategory,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database";

export type {
  Project,
  ProjectStatus,
  Milestone,
  MilestoneStatus,
  Task,
  TaskPriority,
  TaskRiskLevel,
  TaskStatus,
  Conversation,
  ConversationChannel,
  ConversationStatus,
  Message,
  MessageSenderType,
  Approval,
  ApprovalActionType,
  ApprovalStatus,
  AgentRun,
  AgentRunStatus,
  RunArtifact,
  ArtifactType,
  CostRecord,
  AuditEvent,
  Memory,
  MemoryCategory,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
};

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export type RepositoryErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "DATABASE_ERROR";

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryErrorCode,
    public readonly details?: unknown
  ) {
    super(`[Repository Error] ${code}: ${message}`);
    this.name = "RepositoryError";
  }
}

// Project DTOs
export interface CreateProjectDTO {
  name: string;
  description?: string | null;
  repositoryUrl?: string | null;
  defaultBranch?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  repositoryUrl?: string | null;
  defaultBranch?: string;
  status?: ProjectStatus;
  settings?: Record<string, unknown>;
}

// Milestone DTOs
export interface CreateMilestoneDTO {
  title: string;
  description?: string | null;
  sequenceOrder?: number;
}

export interface UpdateMilestoneDTO {
  title?: string;
  description?: string | null;
  sequenceOrder?: number;
  status?: MilestoneStatus;
}

// Task DTOs
export interface CreateTaskDTO {
  title: string;
  description?: string | null;
  milestoneId?: string | null;
  priority?: TaskPriority;
  riskLevel?: TaskRiskLevel;
  estimatedCostInr?: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  milestoneId?: string | null;
  priority?: TaskPriority;
  riskLevel?: TaskRiskLevel;
  status?: TaskStatus;
  estimatedCostInr?: number;
  actualCostInr?: number;
}

export interface TaskFilterOptions extends PaginationOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  riskLevel?: TaskRiskLevel;
  milestoneId?: string;
}

// Conversation DTOs
export interface CreateConversationDTO {
  title: string;
  channel?: ConversationChannel;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateMessageDTO {
  senderType: MessageSenderType;
  content: string;
  payload?: Record<string, unknown>;
  tokenCount?: number;
}
