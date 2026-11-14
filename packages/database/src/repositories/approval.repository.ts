import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ActionType, ApprovalStatus, Json } from '../types.js';

export type ApprovalRequestRow = Database['public']['Tables']['approval_requests']['Row'];
export type ApprovalRequestInsert = Database['public']['Tables']['approval_requests']['Insert'];

export class ApprovalRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createRequest(params: {
    taskId: string;
    userId: string;
    actionType: ActionType;
    payloadPreview: Json;
  }): Promise<ApprovalRequestRow> {
    const { data, error } = await this.client
      .from('approval_requests')
      .insert({
        task_id: params.taskId,
        user_id: params.userId,
        action_type: params.actionType,
        payload_preview: params.payloadPreview,
        status: 'PENDING',
        requested_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async getById(approvalId: string, userId?: string): Promise<ApprovalRequestRow | null> {
    let query = this.client.from('approval_requests').select('*').eq('id', approvalId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async listPendingByUser(userId: string): Promise<ApprovalRequestRow[]> {
    const { data, error } = await this.client
      .from('approval_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async resolveRequest(params: {
    approvalId: string;
    userId: string;
    status: 'APPROVED' | 'REJECTED';
    userComment?: string;
  }): Promise<ApprovalRequestRow> {
    const { data, error } = await this.client
      .from('approval_requests')
      .update({
        status: params.status,
        user_comment: params.userComment ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.approvalId)
      .eq('user_id', params.userId)
      .eq('status', 'PENDING')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(`Approval request ${params.approvalId} not found or already resolved.`);
    }

    return data;
  }
}
