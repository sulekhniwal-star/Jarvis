import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AuditSeverity, CommunicationChannel, Json } from '../types.js';

export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];

export class AuditRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async append(params: {
    userId?: string | null;
    eventType: string;
    severity: AuditSeverity;
    details?: Json;
    clientIp?: string | null;
    channel?: CommunicationChannel;
  }): Promise<AuditLogRow> {
    const { data, error } = await this.client
      .from('audit_logs')
      .insert({
        user_id: params.userId ?? null,
        event_type: params.eventType,
        severity: params.severity,
        details: params.details ?? {},
        client_ip: params.clientIp ?? null,
        channel: params.channel ?? 'SYSTEM',
        timestamp: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async listRecent(options: {
    userId?: string;
    severity?: AuditSeverity;
    limit?: number;
  } = {}): Promise<AuditLogRow[]> {
    let query = this.client.from('audit_logs').select('*');

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    if (options.severity) {
      query = query.eq('severity', options.severity);
    }

    query = query.order('timestamp', { ascending: false }).limit(options.limit ?? 50);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
