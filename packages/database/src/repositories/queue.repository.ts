import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../types.js';

export interface QueueMessageRecord<T = unknown> {
  msgId: number;
  readCount: number;
  enqueuedAt: string;
  vt: string;
  message: T;
}

export class QueueRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Enqueue a task event into the pgmq queue via public wrapper function.
   */
  async enqueueTaskEvent(
    queueName: string,
    taskId: string,
    eventType: string,
    payload: Json = {}
  ): Promise<number> {
    const { data, error } = await this.client.rpc('enqueue_task_event', {
      p_queue: queueName,
      p_task_id: taskId,
      p_event_type: eventType,
      p_payload: payload,
    });

    if (error) throw error;
    return Number(data);
  }

  /**
   * Direct pgmq read using raw query or client RPC if exposed.
   */
  async readMessages<T = unknown>(
    queueName: string,
    vtSeconds = 300,
    batchSize = 1
  ): Promise<QueueMessageRecord<T>[]> {
    // Queries via PostgREST or Supabase RPC on pgmq.read
    const { data, error } = await (this.client as any).rpc('pgmq_read', {
      queue_name: queueName,
      vt: vtSeconds,
      qty: batchSize,
    });

    if (error) {
      // In local dev without pgmq_read rpc, fallback gracefully
      return [];
    }

    return (data ?? []).map((row: any) => ({
      msgId: row.msg_id,
      readCount: row.read_ct,
      enqueuedAt: row.enqueued_at,
      vt: row.vt,
      message: row.message as T,
    }));
  }

  async deleteMessage(queueName: string, msgId: number): Promise<boolean> {
    const { data, error } = await (this.client as any).rpc('pgmq_delete', {
      queue_name: queueName,
      msg_id: msgId,
    });

    if (error) return false;
    return Boolean(data);
  }
}
