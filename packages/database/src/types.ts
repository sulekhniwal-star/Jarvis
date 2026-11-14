/**
 * Database type definitions for Supabase PostgreSQL schema.
 * Corresponds to migrations 20261114000001 through 20261114000004.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type MilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
export type TaskStatus =
  | 'INTAKE'
  | 'SPECIFYING'
  | 'PLANNING'
  | 'PENDING_APPROVAL'
  | 'DISPATCHED'
  | 'RUNNING'
  | 'TESTING'
  | 'SELF_HEALING'
  | 'PR_CREATED'
  | 'COMPLETED'
  | 'ESCALATED'
  | 'CANCELLED'
  | 'EMERGENCY_ABORTED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AgentType =
  | 'SPEC_AGENT'
  | 'PLAN_AGENT'
  | 'CODING_AGENT'
  | 'QA_AGENT'
  | 'REVIEW_AGENT'
  | 'MAINTENANCE_AGENT';

export type RunnerEnvironment = 'LOCAL' | 'GITHUB_ACTIONS' | 'DOCKER';
export type AgentRunStatus = 'STARTING' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';

export type ActionType =
  | 'PROD_DEPLOY'
  | 'SEND_MESSAGE'
  | 'SPEND_FUNDS'
  | 'PAID_AI_INFERENCE'
  | 'MAJOR_ARCH_CHANGE'
  | 'SENSITIVE_DB_OP'
  | 'ACCOUNT_CHANGE'
  | 'DESTRUCTIVE_ACTION'
  | 'NEW_DEPENDENCY';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';
export type CommunicationChannel = 'SYSTEM' | 'TELEGRAM' | 'WEB' | 'RUNNER' | 'GITHUB_WEBHOOK';
export type MemoryCategory = 'DECISION' | 'PATTERN' | 'BUG_FIX' | 'PREFERENCE' | 'ARCH_RECORD';

export interface Database {
  public: {
    Tables: {
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          auto_approve_low_risk: boolean;
          prefer_free_models: boolean;
          default_coding_model: string;
          default_coding_adapter: string;
          monthly_budget_cap_inr: number;
          daily_budget_cap_inr: number;
          emergency_reserve_inr: number;
          emergency_reserve_approved: boolean;
          telegram_chat_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          auto_approve_low_risk?: boolean;
          prefer_free_models?: boolean;
          default_coding_model?: string;
          default_coding_adapter?: string;
          monthly_budget_cap_inr?: number;
          daily_budget_cap_inr?: number;
          emergency_reserve_inr?: number;
          emergency_reserve_approved?: boolean;
          telegram_chat_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          auto_approve_low_risk?: boolean;
          prefer_free_models?: boolean;
          default_coding_model?: string;
          default_coding_adapter?: string;
          monthly_budget_cap_inr?: number;
          daily_budget_cap_inr?: number;
          emergency_reserve_inr?: number;
          emergency_reserve_approved?: boolean;
          telegram_chat_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          github_repo_full_name: string;
          github_installation_id: number;
          default_branch: string;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          github_repo_full_name: string;
          github_installation_id?: number;
          default_branch?: string;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          github_repo_full_name?: string;
          github_installation_id?: number;
          default_branch?: string;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          description: string | null;
          sequence_order: number;
          status: MilestoneStatus;
          target_completion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          sequence_order?: number;
          status?: MilestoneStatus;
          target_completion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          sequence_order?: number;
          status?: MilestoneStatus;
          target_completion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          milestone_id: string | null;
          user_id: string;
          title: string;
          prompt_raw: string;
          specification: Json;
          implementation_plan: Json;
          status: TaskStatus;
          priority: TaskPriority;
          retry_count: number;
          max_retries: number;
          target_branch: string | null;
          pr_number: number | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          milestone_id?: string | null;
          user_id: string;
          title: string;
          prompt_raw: string;
          specification?: Json;
          implementation_plan?: Json;
          status?: TaskStatus;
          priority?: TaskPriority;
          retry_count?: number;
          max_retries?: number;
          target_branch?: string | null;
          pr_number?: number | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          milestone_id?: string | null;
          user_id?: string;
          title?: string;
          prompt_raw?: string;
          specification?: Json;
          implementation_plan?: Json;
          status?: TaskStatus;
          priority?: TaskPriority;
          retry_count?: number;
          max_retries?: number;
          target_branch?: string | null;
          pr_number?: number | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_runs: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          agent_type: AgentType;
          model_id: string;
          runner_environment: RunnerEnvironment;
          github_workflow_run_id: string | null;
          status: AgentRunStatus;
          prompt_tokens: number;
          completion_tokens: number;
          actual_cost_usd: number;
          actual_cost_inr: number;
          is_cost_confirmed: boolean;
          openrouter_generation_id: string | null;
          failure_reason: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          agent_type: AgentType;
          model_id: string;
          runner_environment: RunnerEnvironment;
          github_workflow_run_id?: string | null;
          status?: AgentRunStatus;
          prompt_tokens?: number;
          completion_tokens?: number;
          actual_cost_usd?: number;
          actual_cost_inr?: number;
          is_cost_confirmed?: boolean;
          openrouter_generation_id?: string | null;
          failure_reason?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          agent_type?: AgentType;
          model_id?: string;
          runner_environment?: RunnerEnvironment;
          github_workflow_run_id?: string | null;
          status?: AgentRunStatus;
          prompt_tokens?: number;
          completion_tokens?: number;
          actual_cost_usd?: number;
          actual_cost_inr?: number;
          is_cost_confirmed?: boolean;
          openrouter_generation_id?: string | null;
          failure_reason?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      approval_requests: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          action_type: ActionType;
          payload_preview: Json;
          status: ApprovalStatus;
          user_comment: string | null;
          requested_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          action_type: ActionType;
          payload_preview: Json;
          status?: ApprovalStatus;
          user_comment?: string | null;
          requested_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          action_type?: ActionType;
          payload_preview?: Json;
          status?: ApprovalStatus;
          user_comment?: string | null;
          requested_at?: string;
          resolved_at?: string | null;
        };
      };
      budget_ledgers: {
        Row: {
          id: string;
          user_id: string;
          agent_run_id: string | null;
          billing_date: string;
          amount_inr: number;
          amount_usd: number;
          provider: string;
          model_id: string;
          is_actual: boolean;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_run_id?: string | null;
          billing_date?: string;
          amount_inr: number;
          amount_usd: number;
          provider?: string;
          model_id: string;
          is_actual?: boolean;
          recorded_at?: string;
        };
        Update: never;
      };
      memories: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          category: MemoryCategory;
          content: string;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          category: MemoryCategory;
          content: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          category?: MemoryCategory;
          content?: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          severity: AuditSeverity;
          details: Json;
          client_ip: string | null;
          channel: CommunicationChannel;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          severity: AuditSeverity;
          details?: Json;
          client_ip?: string | null;
          channel?: CommunicationChannel;
          timestamp?: string;
        };
        Update: never;
      };
    };
    Views: {
      v_project_summary: {
        Row: {
          project_id: string;
          user_id: string;
          name: string;
          slug: string;
          status: ProjectStatus;
          total_tasks: number;
          completed_tasks: number;
          active_tasks: number;
          total_cost_inr: number;
        };
      };
    };
    Functions: {
      enqueue_task_event: {
        Args: {
          p_queue: string;
          p_task_id: string;
          p_event_type: string;
          p_payload?: Json;
        };
        Returns: number;
      };
    };
  };
}
