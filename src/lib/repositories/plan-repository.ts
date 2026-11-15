import { BaseRepository } from "./base";
import {
  Plan,
  PlanStatus,
  CreatePlanDTO,
  RepositoryError,
  Json,
  TablesUpdate,
} from "./types";

export class PlanRepository extends BaseRepository {
  public async create(dto: CreatePlanDTO): Promise<Plan> {
    if (!dto.taskId) {
      throw new RepositoryError("Task ID is required.", "VALIDATION_FAILED");
    }
    if (!dto.steps || (Array.isArray(dto.steps) && dto.steps.length === 0)) {
      throw new RepositoryError("At least one plan step is required.", "VALIDATION_FAILED");
    }

    try {
      const { data: plan, error } = await this.client
        .from("plans")
        .insert({
          task_id: dto.taskId,
          steps: (dto.steps ?? []) as Json,
          dependencies: (dto.dependencies ?? []) as Json,
          risk_assessment: (dto.riskAssessment ?? {}) as Json,
          required_approvals: (dto.requiredApprovals ?? []) as Json,
          status: dto.status ?? "draft",
          version: dto.version ?? 1,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create plan for task '${dto.taskId}'`);
      }

      return plan;
    } catch (err) {
      this.handleError(err, `Failed to create plan for task '${dto.taskId}'`);
    }
  }

  public async getById(id: string): Promise<Plan> {
    try {
      const { data, error } = await this.client
        .from("plans")
        .select()
        .eq("id", id)
        .single();

      if (error) {
        this.handleError(error, `Plan not found with id '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Plan not found with id '${id}'`);
    }
  }

  public async findByTaskId(taskId: string): Promise<Plan | null> {
    try {
      const { data, error } = await this.client
        .from("plans")
        .select()
        .eq("task_id", taskId)
        .order("version", { ascending: false })
        .limit(1);

      if (error) {
        this.handleError(error, `Failed to fetch plan for task '${taskId}'`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] ?? null;
    } catch (err) {
      this.handleError(err, `Failed to fetch plan for task '${taskId}'`);
    }
  }

  public async findAllVersions(taskId: string): Promise<Plan[]> {
    try {
      const { data, error } = await this.client
        .from("plans")
        .select()
        .eq("task_id", taskId)
        .order("version", { ascending: true });

      if (error) {
        this.handleError(error, `Failed to fetch plan versions for task '${taskId}'`);
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, `Failed to fetch plan versions for task '${taskId}'`);
    }
  }

  public async createRevision(
    taskId: string,
    dto: Omit<CreatePlanDTO, "taskId" | "version">
  ): Promise<Plan> {
    const latest = await this.findByTaskId(taskId);
    if (latest) {
      // Mark previous plan as superseded
      await this.updateStatus(latest.id, "superseded");
    }

    const nextVersion = (latest?.version ?? 0) + 1;

    return this.create({
      ...dto,
      taskId,
      version: nextVersion,
      status: dto.status ?? "draft",
    });
  }

  public async updateStatus(id: string, status: PlanStatus): Promise<Plan> {
    try {
      const updatePayload: TablesUpdate<"plans"> = {
        status,
      };

      const { data, error } = await this.client
        .from("plans")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to update status for plan '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Failed to update status for plan '${id}'`);
    }
  }
}
