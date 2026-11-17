import { BaseRepository } from "./base";
import { Approval, ApprovalActionType } from "@/types/database";
import { ApprovalStateMachine } from "../state-machines/approval-state-machine";
import { RepositoryError } from "./types";

export interface CreateApprovalDTO {
  actionType: ApprovalActionType;
  targetResource: string;
  scope: Record<string, unknown>;
  expiresAt: string | Date;
  taskId?: string | null;
}

export interface ApprovalFilters {
  status?: "all" | "pending" | "approved" | "rejected" | "expired";
  actionType?: ApprovalActionType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApprovalMetrics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
}

export class ApprovalRepository extends BaseRepository {
  public async createApproval(
    userId: string,
    data: CreateApprovalDTO
  ): Promise<Approval> {
    if (!data.actionType || !data.targetResource) {
      throw new RepositoryError(
        "actionType and targetResource are required to create an approval request.",
        "VALIDATION_FAILED"
      );
    }

    const expiresAtIso =
      typeof data.expiresAt === "string"
        ? data.expiresAt
        : data.expiresAt.toISOString();

    try {
      const { data: approval, error } = await this.client
        .from("approvals")
        .insert({
          user_id: userId,
          task_id: data.taskId ?? null,
          action_type: data.actionType,
          target_resource: data.targetResource,
          scope: data.scope ?? {},
          status: "pending",
          requested_at: new Date().toISOString(),
          expires_at: expiresAtIso,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, "Failed to create approval request");
      }

      return approval;
    } catch (err) {
      this.handleError(err, "Failed to create approval request");
    }
  }

  public async getById(id: string, userId: string): Promise<Approval> {
    try {
      const { data, error } = await this.client
        .from("approvals")
        .select()
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) {
        this.handleError(error, `Approval request not found with id '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Approval request not found with id '${id}'`);
    }
  }

  public async getApproval(id: string, userId?: string): Promise<Approval | null> {
    try {
      let query = this.client.from("approvals").select().eq("id", id);
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query.single();
      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }

  public async recordDecision(
    id: string,
    userId: string,
    decision: "approved" | "rejected",
    reason?: string
  ): Promise<Approval> {
    const existing = await this.getById(id, userId);

    // Validate using state machine
    ApprovalStateMachine.assertDecision(existing.status, decision, existing.expires_at);

    try {
      const { data: updated, error } = await this.client
        .from("approvals")
        .update({
          status: decision,
          decision_reason: reason ?? null,
          decided_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to record decision on approval '${id}'`);
      }

      return updated;
    } catch (err) {
      this.handleError(err, `Failed to record decision on approval '${id}'`);
    }
  }

  public async listPending(userId: string): Promise<Approval[]> {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await this.client
        .from("approvals")
        .select()
        .eq("user_id", userId)
        .eq("status", "pending")
        .gt("expires_at", nowIso)
        .order("requested_at", { ascending: false });

      if (error) {
        this.handleError(error, "Failed to list pending approvals");
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, "Failed to list pending approvals");
    }
  }

  public async listApprovals(
    userId: string,
    filters: ApprovalFilters = {}
  ): Promise<{ data: Approval[]; total: number }> {
    try {
      const nowIso = new Date().toISOString();
      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      let query = this.client
        .from("approvals")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      if (filters.actionType) {
        query = query.eq("action_type", filters.actionType);
      }

      if (filters.status && filters.status !== "all") {
        if (filters.status === "pending") {
          query = query.eq("status", "pending").gt("expires_at", nowIso);
        } else if (filters.status === "expired") {
          query = query.or(`status.eq.expired,and(status.eq.pending,expires_at.lte.${nowIso})`);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters.search) {
        query = query.or(
          `target_resource.ilike.%${filters.search}%,action_type.ilike.%${filters.search}%`
        );
      }

      query = query
        .order("requested_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        this.handleError(error, "Failed to list approvals");
      }

      return {
        data: data ?? [],
        total: count ?? 0,
      };
    } catch (err) {
      this.handleError(err, "Failed to list approvals");
    }
  }

  public async getApprovalMetrics(userId: string): Promise<ApprovalMetrics> {
    try {
      const { data, error } = await this.client
        .from("approvals")
        .select("status, expires_at")
        .eq("user_id", userId);

      if (error) {
        this.handleError(error, "Failed to fetch approval metrics");
      }

      const now = Date.now();
      const approvals = data ?? [];

      const total = approvals.length;
      let pending = 0;
      let approved = 0;
      let rejected = 0;
      let expired = 0;

      for (const item of approvals) {
        const isExpired = new Date(item.expires_at).getTime() <= now;

        if (item.status === "approved") {
          approved++;
        } else if (item.status === "rejected") {
          rejected++;
        } else if (item.status === "expired" || (item.status === "pending" && isExpired)) {
          expired++;
        } else if (item.status === "pending" && !isExpired) {
          pending++;
        }
      }

      return {
        total,
        pending,
        approved,
        rejected,
        expired,
      };
    } catch (err) {
      this.handleError(err, "Failed to fetch approval metrics");
    }
  }

  public async hasActiveApproval(
    userId: string,
    actionType: ApprovalActionType
  ): Promise<boolean> {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await this.client
        .from("approvals")
        .select("id")
        .eq("user_id", userId)
        .eq("action_type", actionType)
        .eq("status", "approved")
        .gt("expires_at", nowIso)
        .limit(1);

      if (error) {
        this.handleError(error, "Failed to check active approvals");
      }

      return Boolean(data && data.length > 0);
    } catch (err) {
      this.handleError(err, "Failed to check active approvals");
    }
  }
}
