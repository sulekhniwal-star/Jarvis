import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectStatus } from '../types.js';

export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

export class ProjectRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(project: ProjectInsert): Promise<ProjectRow> {
    const { data, error } = await this.client
      .from('projects')
      .insert(project)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async getById(projectId: string, userId: string): Promise<ProjectRow | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getBySlug(slug: string, userId: string): Promise<ProjectRow | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async listByUser(userId: string): Promise<ProjectRow[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async updateStatus(projectId: string, userId: string, status: ProjectStatus): Promise<ProjectRow> {
    const { data, error } = await this.client
      .from('projects')
      .update({ status })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}
