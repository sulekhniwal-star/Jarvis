import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, MilestoneStatus } from '../types.js';

export type MilestoneRow = Database['public']['Tables']['milestones']['Row'];
export type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];

export class MilestoneRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(milestone: MilestoneInsert): Promise<MilestoneRow> {
    const { data, error } = await this.client
      .from('milestones')
      .insert(milestone)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async listByProject(projectId: string, userId: string): Promise<MilestoneRow[]> {
    const { data, error } = await this.client
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('sequence_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async updateStatus(
    milestoneId: string,
    userId: string,
    status: MilestoneStatus
  ): Promise<MilestoneRow> {
    const { data, error } = await this.client
      .from('milestones')
      .update({ status })
      .eq('id', milestoneId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}
