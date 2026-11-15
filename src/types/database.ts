export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
  | Record<string, unknown>;

export type ProjectStatus = "active" | "archived" | "paused";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskRiskLevel = "low" | "medium" | "high";
export type TaskStatus =
  | "intake"
  | "specifying"
  | "planned"
  | "awaiting_approval"
  | "running"
  | "verifying"
  | "completed"
  | "failed"
  | "cancelled";

export type PlanStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "superseded";

export type ApprovalActionType =
  | "git_remote_push"
  | "production_deploy"
  | "paid_ai_inference"
  | "destructive_db_mutation"
  | "external_message";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "verifying"
  | "completed"
  | "failed"
  | "timed_out";

export type ArtifactType =
  | "test_log"
  | "build_log"
  | "diff"
  | "screenshot"
  | "linter_report";

export type MemoryCategory =
  | "user_preference"
  | "project_decision"
  | "architecture_pattern"
  | "historical_error";

export type ConversationChannel = "web" | "telegram";
export type ConversationStatus = "active" | "archived";
export type MessageSenderType = "user" | "agent" | "system";

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          timezone: string;
          telegram_chat_id: number | null;
          monthly_budget_inr: number;
          daily_budget_inr: number;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          timezone?: string;
          telegram_chat_id?: number | null;
          monthly_budget_inr?: number;
          daily_budget_inr?: number;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          timezone?: string;
          telegram_chat_id?: number | null;
          monthly_budget_inr?: number;
          daily_budget_inr?: number;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          repository_url: string | null;
          default_branch: string;
          status: ProjectStatus;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          repository_url?: string | null;
          default_branch?: string;
          status?: ProjectStatus;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          repository_url?: string | null;
          default_branch?: string;
          status?: ProjectStatus;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          sequence_order: number;
          status: MilestoneStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          sequence_order?: number;
          status?: MilestoneStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          sequence_order?: number;
          status?: MilestoneStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          milestone_id: string | null;
          title: string;
          description: string | null;
          priority: TaskPriority;
          risk_level: TaskRiskLevel;
          status: TaskStatus;
          estimated_cost_inr: number;
          actual_cost_inr: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          milestone_id?: string | null;
          title: string;
          description?: string | null;
          priority?: TaskPriority;
          risk_level?: TaskRiskLevel;
          status?: TaskStatus;
          estimated_cost_inr?: number;
          actual_cost_inr?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          milestone_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: TaskPriority;
          risk_level?: TaskRiskLevel;
          status?: TaskStatus;
          estimated_cost_inr?: number;
          actual_cost_inr?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      specifications: {
        Row: {
          id: string;
          task_id: string;
          scope: string;
          exclusions: string;
          acceptance_criteria: Json;
          raw_user_prompt: string;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          scope: string;
          exclusions: string;
          acceptance_criteria?: Json;
          raw_user_prompt: string;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          scope?: string;
          exclusions?: string;
          acceptance_criteria?: Json;
          raw_user_prompt?: string;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          task_id: string;
          steps: Json;
          dependencies: Json;
          risk_assessment: Json;
          required_approvals: Json;
          status: PlanStatus;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          steps?: Json;
          dependencies?: Json;
          risk_assessment?: Json;
          required_approvals?: Json;
          status?: PlanStatus;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          steps?: Json;
          dependencies?: Json;
          risk_assessment?: Json;
          required_approvals?: Json;
          status?: PlanStatus;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      approvals: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          action_type: ApprovalActionType;
          target_resource: string;
          scope: Json;
          status: ApprovalStatus;
          decision_reason: string | null;
          requested_at: string;
          decided_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          action_type: ApprovalActionType;
          target_resource: string;
          scope: Json;
          status?: ApprovalStatus;
          decision_reason?: string | null;
          requested_at?: string;
          decided_at?: string | null;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          action_type?: ApprovalActionType;
          target_resource?: string;
          scope?: Json;
          status?: ApprovalStatus;
          decision_reason?: string | null;
          requested_at?: string;
          decided_at?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      agent_runs: {
        Row: {
          id: string;
          task_id: string;
          agent_engine: string;
          status: AgentRunStatus;
          exit_code: number | null;
          git_head_before: string | null;
          git_commit_hash: string | null;
          diff_patch: string | null;
          test_results: Json;
          retry_count: number;
          error_summary: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          agent_engine?: string;
          status?: AgentRunStatus;
          exit_code?: number | null;
          git_head_before?: string | null;
          git_commit_hash?: string | null;
          diff_patch?: string | null;
          test_results?: Json;
          retry_count?: number;
          error_summary?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          agent_engine?: string;
          status?: AgentRunStatus;
          exit_code?: number | null;
          git_head_before?: string | null;
          git_commit_hash?: string | null;
          diff_patch?: string | null;
          test_results?: Json;
          retry_count?: number;
          error_summary?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      run_artifacts: {
        Row: {
          id: string;
          run_id: string;
          artifact_type: ArtifactType;
          storage_path: string;
          file_size_bytes: number;
          mime_type: string;
          checksum_sha256: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          artifact_type: ArtifactType;
          storage_path: string;
          file_size_bytes: number;
          mime_type: string;
          checksum_sha256: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          artifact_type?: ArtifactType;
          storage_path?: string;
          file_size_bytes?: number;
          mime_type?: string;
          checksum_sha256?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cost_records: {
        Row: {
          id: string;
          user_id: string;
          run_id: string | null;
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost_inr: number;
          is_estimated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          run_id?: string | null;
          provider?: string;
          model: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          cost_inr?: number;
          is_estimated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          run_id?: string | null;
          provider?: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          cost_inr?: number;
          is_estimated?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          resource_type: string;
          resource_id: string;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          resource_type: string;
          resource_id: string;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_type?: string;
          resource_type?: string;
          resource_id?: string;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          category: MemoryCategory;
          content: string;
          embedding: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          category: MemoryCategory;
          content: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          category?: MemoryCategory;
          content?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          channel: ConversationChannel;
          status: ConversationStatus;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          channel?: ConversationChannel;
          status?: ConversationStatus;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          channel?: ConversationChannel;
          status?: ConversationStatus;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_type: MessageSenderType;
          content: string;
          payload: Json;
          token_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_type: MessageSenderType;
          content: string;
          payload?: Json;
          token_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_type?: MessageSenderType;
          content?: string;
          payload?: Json;
          token_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper Types for Row, Insert, and Update
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience Row Types
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Specification = Database["public"]["Tables"]["specifications"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Approval = Database["public"]["Tables"]["approvals"]["Row"];
export type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];
export type RunArtifact = Database["public"]["Tables"]["run_artifacts"]["Row"];
export type CostRecord = Database["public"]["Tables"]["cost_records"]["Row"];
export type AuditEvent = Database["public"]["Tables"]["audit_events"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
