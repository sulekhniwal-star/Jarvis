import { AgentRunStatus, Json } from "./database";

export interface EnrichedAgentRun {
  id: string;
  task_id: string;
  agent_engine: string;
  status: AgentRunStatus;
  git_commit_hash?: string | null;
  exit_code?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  taskTitle?: string;
  taskPriority?: string;
  projectName?: string;
  projectSlug?: string;
  durationMs?: number | null;
  error_summary?: string | null;
  test_results?: Json;
}

export interface AgentMetrics {
  totalRuns: number;
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number;
  avgDurationMs: number;
}
