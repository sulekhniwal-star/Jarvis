import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AgentType, RunnerEnvironment, AgentRunStatus } from '../types.js';

export type AgentRunRow = Database['public']['Tables']['agent_runs']['Row'];
export type AgentRunInsert = Database['public']['Tables']['agent_runs']['Insert'];
export type AgentRunUpdate = Database['public']['Tables']['agent_runs']['Update'];

export class AgentRunRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async startRun(params: {
    taskId: string;
    userId: string;
    agentType: AgentType;
    modelId: string;
    runnerEnvironment: RunnerEnvironment;
    githubWorkflowRunId?: string;
  }): Promise<AgentRunRow> {
    const { data, error } = await this.client
      .from('agent_runs')
      .insert({
        task_id: params.taskId,
        user_id: params.userId,
        agent_type: params.agentType,
        model_id: params.modelId,
        runner_environment: params.runnerEnvironment,
        github_workflow_run_id: params.githubWorkflowRunId ?? null,
        status: 'STARTING',
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async recordTelemetry(
    agentRunId: string,
    telemetry: {
      promptTokens: number;
      completionTokens: number;
      actualCostUsd: number;
      actualCostInr: number;
      isCostConfirmed: boolean;
      openrouterGenId?: string;
    }
  ): Promise<AgentRunRow> {
    const { data, error } = await this.client
      .from('agent_runs')
      .update({
        prompt_tokens: telemetry.promptTokens,
        completion_tokens: telemetry.completionTokens,
        actual_cost_usd: telemetry.actualCostUsd,
        actual_cost_inr: telemetry.actualCostInr,
        is_cost_confirmed: telemetry.isCostConfirmed,
        openrouter_generation_id: telemetry.openrouterGenId ?? null,
      })
      .eq('id', agentRunId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async finishRun(
    agentRunId: string,
    status: AgentRunStatus,
    failureReason?: string
  ): Promise<AgentRunRow> {
    const { data, error } = await this.client
      .from('agent_runs')
      .update({
        status,
        failure_reason: failureReason ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', agentRunId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async listByTask(taskId: string): Promise<AgentRunRow[]> {
    const { data, error } = await this.client
      .from('agent_runs')
      .select('*')
      .eq('task_id', taskId)
      .order('started_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }
}
