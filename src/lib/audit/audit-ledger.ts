import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const GENESIS_PREV_HASH = "0".repeat(64);

export interface AuditChainMetadata {
  sequence: number;
  prev_hash: string;
  hash: string;
}

export interface AuditEventInput {
  userId?: string | null;
  eventType: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
}

export interface AuditEventRecord {
  id: string;
  user_id: string | null;
  event_type: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown> & { _audit?: AuditChainMetadata };
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  sequence: number;
  prev_hash: string;
  hash: string;
}

export interface AuditChainVerificationResult {
  isValid: boolean;
  verifiedCount: number;
  chainHeadHash: string;
  corruptedEventId?: string;
  corruptedSequence?: number;
  error?: string;
  timestamp: string;
}

export interface AuditFilters {
  eventType?: string;
  resourceType?: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Deterministically canonicalizes a JSON-compatible object or primitive.
 * Enforces key ordering so that cryptographic hashes are reproducible.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalizeJson(item)).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts = keys.map((key) => {
    return JSON.stringify(key) + ":" + canonicalizeJson(record[key]);
  });
  return "{" + parts.join(",") + "}";
}

/**
 * Computes deterministic SHA-256 block hash for an audit ledger entry.
 */
export function computeBlockHash(params: {
  sequence: number;
  prev_hash: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}): string {
  // Exclude _audit metadata envelope if present in payload to avoid recursive self-reference
  const payloadCopy = { ...params.payload };
  delete payloadCopy._audit;

  const canonicalPayload = canonicalizeJson(payloadCopy);
  const normalizedTimestamp = new Date(params.created_at).toISOString();

  const preimage = [
    params.sequence,
    params.prev_hash,
    params.event_type,
    params.resource_type,
    params.resource_id,
    canonicalPayload,
    normalizedTimestamp,
  ].join(":");

  return crypto.createHash("sha256").update(preimage).digest("hex");
}

export class AuditLedgerService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    if (supabase) {
      this.supabase = supabase;
    } else {
      this.supabase = createAdminClient();
    }
  }

  /**
   * Retrieves the most recent audit entry in the chain to get the current sequence and head hash.
   */
  public async getLatestEvent(userId?: string | null): Promise<AuditEventRecord | null> {
    let query = this.supabase
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return null;
    }

    return this.mapToRecord(data[0]);
  }

  /**
   * Records a new audit event, automatically computing the next sequence number,
   * linking to the prior block's hash, and appending the record.
   */
  public async recordEvent(input: AuditEventInput): Promise<AuditEventRecord> {
    const latest = await this.getLatestEvent(input.userId);

    const sequence = latest ? latest.sequence + 1 : 1;
    const prev_hash = latest ? latest.hash : GENESIS_PREV_HASH;
    const createdAt = input.createdAt || new Date().toISOString();

    const rawDetails = input.details || {};
    const hash = computeBlockHash({
      sequence,
      prev_hash,
      event_type: input.eventType,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      payload: rawDetails,
      created_at: createdAt,
    });

    const enrichedDetails = {
      ...rawDetails,
      _audit: {
        sequence,
        prev_hash,
        hash,
      },
    };

    const insertPayload = {
      user_id: input.userId ?? null,
      event_type: input.eventType,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      details: enrichedDetails,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      created_at: createdAt,
    };

    const { data, error } = await this.supabase
      .from("audit_events")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record audit event: ${error?.message || "Unknown error"}`);
    }

    return this.mapToRecord(data);
  }

  /**
   * Cryptographically verifies the integrity of the audit chain from genesis to head.
   * Asserts sequence continuity, prev_hash linkage, and payload SHA-256 equivalence.
   */
  public async verifyChainIntegrity(options?: {
    userId?: string | null;
    limit?: number;
  }): Promise<AuditChainVerificationResult> {
    let query = this.supabase
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: true });

    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    const now = new Date().toISOString();

    if (error) {
      return {
        isValid: false,
        verifiedCount: 0,
        chainHeadHash: GENESIS_PREV_HASH,
        error: `Database query error: ${error.message}`,
        timestamp: now,
      };
    }

    if (!data || data.length === 0) {
      return {
        isValid: true,
        verifiedCount: 0,
        chainHeadHash: GENESIS_PREV_HASH,
        timestamp: now,
      };
    }

    const records = data.map((row) => this.mapToRecord(row));
    let expectedPrevHash = GENESIS_PREV_HASH;
    let expectedSequence = 1;

    for (let i = 0; i < records.length; i++) {
      const record = records[i]!;

      // 1. Verify sequence monotonicity
      if (record.sequence !== expectedSequence) {
        return {
          isValid: false,
          verifiedCount: i,
          chainHeadHash: expectedPrevHash,
          corruptedEventId: record.id,
          corruptedSequence: record.sequence,
          error: `Sequence gap detected at index ${i}: expected ${expectedSequence}, found ${record.sequence}`,
          timestamp: now,
        };
      }

      // 2. Verify prev_hash linkage
      if (record.prev_hash !== expectedPrevHash) {
        return {
          isValid: false,
          verifiedCount: i,
          chainHeadHash: expectedPrevHash,
          corruptedEventId: record.id,
          corruptedSequence: record.sequence,
          error: `Broken chain link at index ${i} (ID: ${record.id}): expected prev_hash ${expectedPrevHash.slice(0, 12)}..., found ${record.prev_hash.slice(0, 12)}...`,
          timestamp: now,
        };
      }

      // 3. Recompute block hash and assert exact cryptographic match
      const recomputedHash = computeBlockHash({
        sequence: record.sequence,
        prev_hash: record.prev_hash,
        event_type: record.event_type,
        resource_type: record.resource_type,
        resource_id: record.resource_id,
        payload: record.details,
        created_at: record.created_at,
      });

      if (recomputedHash !== record.hash) {
        return {
          isValid: false,
          verifiedCount: i,
          chainHeadHash: expectedPrevHash,
          corruptedEventId: record.id,
          corruptedSequence: record.sequence,
          error: `Cryptographic digest mismatch at index ${i} (ID: ${record.id}): expected hash ${recomputedHash.slice(0, 12)}..., recorded hash ${record.hash.slice(0, 12)}...`,
          timestamp: now,
        };
      }

      expectedPrevHash = record.hash;
      expectedSequence++;
    }

    const headHash = records.length > 0 ? records[records.length - 1]!.hash : GENESIS_PREV_HASH;

    return {
      isValid: true,
      verifiedCount: records.length,
      chainHeadHash: headHash,
      timestamp: now,
    };
  }

  /**
   * Retrieves paginated audit logs with optional filtering.
   */
  public async listEvents(
    userId: string | null,
    filters?: AuditFilters
  ): Promise<{ events: AuditEventRecord[]; total: number }> {
    let query = this.supabase
      .from("audit_events")
      .select("*", { count: "exact" });

    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (filters?.eventType) {
      query = query.eq("event_type", filters.eventType);
    }
    if (filters?.resourceType) {
      query = query.eq("resource_type", filters.resourceType);
    }
    if (filters?.resourceId) {
      query = query.eq("resource_id", filters.resourceId);
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to list audit events: ${error.message}`);
    }

    const events = (data || []).map((row) => this.mapToRecord(row));
    return {
      events,
      total: count ?? events.length,
    };
  }

  private mapToRecord(row: any): AuditEventRecord {
    const details = (row.details || {}) as Record<string, unknown> & { _audit?: AuditChainMetadata };
    const auditMeta = details._audit;

    return {
      id: row.id,
      user_id: row.user_id,
      event_type: row.event_type,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      details,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at,
      sequence: auditMeta?.sequence ?? 0,
      prev_hash: auditMeta?.prev_hash ?? GENESIS_PREV_HASH,
      hash: auditMeta?.hash ?? "",
    };
  }
}
