import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types.js';

export type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

export class UserRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getPreferences(userId: string): Promise<UserPreferencesRow | null> {
    const { data, error } = await this.client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsertPreferences(
    userId: string,
    updates: Partial<UserPreferencesUpdate>
  ): Promise<UserPreferencesRow> {
    const { data, error } = await this.client
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...updates,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}
