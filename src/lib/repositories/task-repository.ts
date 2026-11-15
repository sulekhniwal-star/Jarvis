import { BaseRepository } from "./base";
import {
  Task,
  TaskStatus,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskFilterOptions,
  PaginatedResult,
  RepositoryError,
  TablesUpdate,
} from "./types";

export class TaskRepository extends BaseRepository {
  public async create(projectId: string, data: CreateTaskDTO): Promise<Task> {
    if (!data.title || data.title.trim().length === 0) {
      throw new RepositoryError("Task title is required.", "VALIDATION_FAILED");
    }

    try {
      const { data: task, error } = await this.client
        .from("tasks")
        .insert({
          project_id: projectId,
          milestone_id: data.milestoneId ?? null,
          title: data.title.trim(),
          description: data.description ?? null,
          priority: data.priority ?? "medium",
          risk_level: data.riskLevel ?? "low",
          status: "intake",
          estimated_cost_inr: data.estimatedCostInr ?? 0.0,
          actual_cost_inr: 0.0,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create task '${data.title}'`);
      }

      return task;
    } catch (err) {
      this.handleError(err, `Failed to create task '${data.title}'`);
    }
  }

  public async getById(id: string): Promise<Task> {
    try {
      const { data, error } = await this.client
        .from("tasks")
        .select()
        .eq("id", id)
        .single();

      if (error) {
        this.handleError(error, `Task not found with id '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Task not found with id '${id}'`);
    }
  }

  public async listByProject(
    projectId: string,
    filters: TaskFilterOptions = {}
  ): Promise<PaginatedResult<Task>> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const sortBy = filters.sortBy ?? "created_at";
    const ascending = filters.sortDirection === "asc";

    try {
      let query = this.client
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("project_id", projectId);

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.priority) query = query.eq("priority", filters.priority);
      if (filters.riskLevel) query = query.eq("risk_level", filters.riskLevel);
      if (filters.milestoneId) query = query.eq("milestone_id", filters.milestoneId);

      const { data, error, count } = await query
        .order(sortBy, { ascending })
        .range(offset, offset + limit - 1);

      if (error) {
        this.handleError(error, `Failed to list tasks for project '${projectId}'`);
      }

      return {
        data: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      };
    } catch (err) {
      this.handleError(err, `Failed to list tasks for project '${projectId}'`);
    }
  }

  public async update(id: string, data: UpdateTaskDTO): Promise<Task> {
    try {
      const updatePayload: TablesUpdate<"tasks"> = {
        updated_at: new Date().toISOString(),
      };

      if (data.title !== undefined) updatePayload.title = data.title.trim();
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.milestoneId !== undefined) updatePayload.milestone_id = data.milestoneId;
      if (data.priority !== undefined) updatePayload.priority = data.priority;
      if (data.riskLevel !== undefined) updatePayload.risk_level = data.riskLevel;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.estimatedCostInr !== undefined) updatePayload.estimated_cost_inr = data.estimatedCostInr;
      if (data.actualCostInr !== undefined) updatePayload.actual_cost_inr = data.actualCostInr;

      const { data: task, error } = await this.client
        .from("tasks")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to update task '${id}'`);
      }

      return task;
    } catch (err) {
      this.handleError(err, `Failed to update task '${id}'`);
    }
  }

  public async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  }

  public async recordCost(
    id: string,
    estimatedDelta: number,
    actualDelta: number
  ): Promise<Task> {
    const task = await this.getById(id);
    return this.update(id, {
      estimatedCostInr: Number((task.estimated_cost_inr + estimatedDelta).toFixed(2)),
      actualCostInr: Number((task.actual_cost_inr + actualDelta).toFixed(2)),
    });
  }
}
