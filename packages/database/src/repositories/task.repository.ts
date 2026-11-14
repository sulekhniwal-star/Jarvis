import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TaskStatus, TaskPriority, Json } from '../types.js';

export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export class TaskRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(task: TaskInsert): Promise<TaskRow> {
    const { data, error } = await this.client
      .from('tasks')
      .insert({
        ...task,
        version: 1,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async getById(taskId: string, userId?: string): Promise<TaskRow | null> {
    let query = this.client.from('tasks').select('*').eq('id', taskId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async listByProject(
    projectId: string,
    userId: string,
    options: { status?: TaskStatus; limit?: number; offset?: number } = {}
  ): Promise<TaskRow[]> {
    let query = this.client
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Idempotent state transition with optimistic concurrency lock.
   * Increments `version` and verifies expected status and version match.
   */
  async updateStatusWithOptimisticLock(
    taskId: string,
    userId: string,
    toStatus: TaskStatus,
    expectedVersion: number,
    extraUpdates: Partial<TaskUpdate> = {}
  ): Promise<TaskRow> {
    const { data, error } = await this.client
      .from('tasks')
      .update({
        status: toStatus,
        version: expectedVersion + 1,
        ...extraUpdates,
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .eq('version', expectedVersion)
      .select('*')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        `Optimistic lock failure or task not found: Task ${taskId} has version mismatch (expected ${expectedVersion})`
      );
    }

    return data;
  }

  async updateSpecification(
    taskId: string,
    userId: string,
    specification: Json,
    expectedVersion: number
  ): Promise<TaskRow> {
    return this.updateStatusWithOptimisticLock(taskId, userId, 'SPECIFYING', expectedVersion, {
      specification,
    });
  }

  async updatePlan(
    taskId: string,
    userId: string,
    implementationPlan: Json,
    expectedVersion: number
  ): Promise<TaskRow> {
    return this.updateStatusWithOptimisticLock(taskId, userId, 'PLANNING', expectedVersion, {
      implementation_plan: implementationPlan,
    });
  }

  async incrementRetryCount(
    taskId: string,
    userId: string,
    expectedVersion: number
  ): Promise<TaskRow> {
    const current = await this.getById(taskId, userId);
    if (!current) throw new Error(`Task ${taskId} not found`);

    return this.updateStatusWithOptimisticLock(taskId, userId, 'SELF_HEALING', expectedVersion, {
      retry_count: current.retry_count + 1,
    });
  }
}
