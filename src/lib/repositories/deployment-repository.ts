import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { BaseRepository } from "./base";
import {
  DeploymentRecord,
  DeploymentFilterOptions,
  DeploymentNotFoundError,
} from "../deployment/types";
import crypto from "crypto";

export class DeploymentRepository extends BaseRepository {
  private static inMemoryStore: Map<string, DeploymentRecord> = new Map();

  constructor(client?: SupabaseClient<Database>) {
    super(client || ({} as unknown as SupabaseClient<Database>));
  }

  public static clearInMemoryStore(): void {
    DeploymentRepository.inMemoryStore.clear();
  }

  public static seedInMemoryStore(records: DeploymentRecord[]): void {
    for (const record of records) {
      DeploymentRepository.inMemoryStore.set(record.id, { ...record });
    }
  }

  public async createDeployment(
    data: Omit<DeploymentRecord, "id" | "created_at" | "updated_at"> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  ): Promise<DeploymentRecord> {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const record: DeploymentRecord = {
      id,
      environment: data.environment,
      commit_sha: data.commit_sha,
      commit_message: data.commit_message || "",
      branch: data.branch || "main",
      status: data.status || "building",
      preview_url: data.preview_url ?? null,
      production_url: data.production_url ?? null,
      approval_id: data.approval_id ?? null,
      created_by: data.created_by ?? null,
      rollback_target_id: data.rollback_target_id ?? null,
      verification_passed: data.verification_passed ?? true,
      verification_summary: data.verification_summary ?? null,
      error_message: data.error_message ?? null,
      deployed_at: data.deployed_at ?? null,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    if (this.client && typeof this.client.from === "function") {
      try {
        const { data: dbData, error } = await this.client
          .from("deployments" as any)
          .insert(record as any)
          .select()
          .single();

        if (!error && dbData) {
          DeploymentRepository.inMemoryStore.set(record.id, record);
          return dbData as unknown as DeploymentRecord;
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    DeploymentRepository.inMemoryStore.set(record.id, record);
    return record;
  }

  public async getDeployment(id: string): Promise<DeploymentRecord | null> {
    if (this.client && typeof this.client.from === "function") {
      try {
        const { data, error } = await this.client
          .from("deployments" as any)
          .select("*")
          .eq("id", id)
          .single();

        if (!error && data) {
          return data as unknown as DeploymentRecord;
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    return DeploymentRepository.inMemoryStore.get(id) || null;
  }

  public async listDeployments(
    filters: DeploymentFilterOptions = {}
  ): Promise<{ data: DeploymentRecord[]; count: number }> {
    const { environment, status, limit = 50, offset = 0 } = filters;

    if (this.client && typeof this.client.from === "function") {
      try {
        let query = this.client
          .from("deployments" as any)
          .select("*", { count: "exact" });

        if (environment) {
          query = query.eq("environment", environment);
        }
        if (status) {
          query = query.eq("status", status);
        }

        query = query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (!error && data) {
          return {
            data: data as unknown as DeploymentRecord[],
            count: count ?? data.length,
          };
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    // In-memory filtering
    let records = Array.from(DeploymentRepository.inMemoryStore.values());

    if (environment) {
      records = records.filter((r) => r.environment === environment);
    }
    if (status) {
      records = records.filter((r) => r.status === status);
    }

    records.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const totalCount = records.length;
    const paginated = records.slice(offset, offset + limit);

    return {
      data: paginated,
      count: totalCount,
    };
  }

  public async updateDeployment(
    id: string,
    updates: Partial<DeploymentRecord>
  ): Promise<DeploymentRecord> {
    const existing = await this.getDeployment(id);
    if (!existing) {
      throw new DeploymentNotFoundError(id);
    }

    const now = new Date().toISOString();
    const updated: DeploymentRecord = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    if (this.client && typeof this.client.from === "function") {
      try {
        const { data, error } = await this.client
          .from("deployments" as any)
          .update({ ...updates, updated_at: now } as any)
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          DeploymentRepository.inMemoryStore.set(id, updated);
          return data as unknown as DeploymentRecord;
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    DeploymentRepository.inMemoryStore.set(id, updated);
    return updated;
  }

  public async getActiveProductionDeployment(): Promise<DeploymentRecord | null> {
    if (this.client && typeof this.client.from === "function") {
      try {
        const { data, error } = await this.client
          .from("deployments" as any)
          .select("*")
          .eq("environment", "production")
          .eq("status", "deployed")
          .order("deployed_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          return data[0] as unknown as DeploymentRecord;
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    const deployed = Array.from(
      DeploymentRepository.inMemoryStore.values()
    ).filter((r) => r.environment === "production" && r.status === "deployed");

    if (deployed.length === 0) return null;

    deployed.sort((a, b) => {
      const timeA = a.deployed_at ? new Date(a.deployed_at).getTime() : 0;
      const timeB = b.deployed_at ? new Date(b.deployed_at).getTime() : 0;
      return timeB - timeA;
    });

    return deployed[0] ?? null;
  }

  public async getLatestPreviewDeployment(): Promise<DeploymentRecord | null> {
    if (this.client && typeof this.client.from === "function") {
      try {
        const { data, error } = await this.client
          .from("deployments" as any)
          .select("*")
          .eq("environment", "preview")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          return data[0] as unknown as DeploymentRecord;
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    const previews = Array.from(
      DeploymentRepository.inMemoryStore.values()
    ).filter((r) => r.environment === "preview");

    if (previews.length === 0) return null;

    previews.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return previews[0] ?? null;
  }
}
