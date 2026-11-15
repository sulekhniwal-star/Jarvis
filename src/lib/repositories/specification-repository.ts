import { BaseRepository } from "./base";
import {
  Specification,
  CreateSpecificationDTO,
  RepositoryError,
  Json,
} from "./types";

export class SpecificationRepository extends BaseRepository {
  public async create(data: CreateSpecificationDTO): Promise<Specification> {
    if (!data.taskId) {
      throw new RepositoryError("Task ID is required.", "VALIDATION_FAILED");
    }
    if (!data.scope || data.scope.trim().length === 0) {
      throw new RepositoryError("Scope description is required.", "VALIDATION_FAILED");
    }
    if (!data.exclusions || data.exclusions.trim().length === 0) {
      throw new RepositoryError("Exclusions description is required.", "VALIDATION_FAILED");
    }
    if (!data.rawUserPrompt || data.rawUserPrompt.trim().length === 0) {
      throw new RepositoryError("Raw user prompt is required.", "VALIDATION_FAILED");
    }

    try {
      const { data: spec, error } = await this.client
        .from("specifications")
        .insert({
          task_id: data.taskId,
          scope: data.scope.trim(),
          exclusions: data.exclusions.trim(),
          acceptance_criteria: (data.acceptanceCriteria ?? []) as Json,
          raw_user_prompt: data.rawUserPrompt.trim(),
          version: data.version ?? 1,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create specification for task '${data.taskId}'`);
      }

      return spec;
    } catch (err) {
      this.handleError(err, `Failed to create specification for task '${data.taskId}'`);
    }
  }

  public async findByTaskId(taskId: string): Promise<Specification | null> {
    try {
      const { data, error } = await this.client
        .from("specifications")
        .select()
        .eq("task_id", taskId)
        .order("version", { ascending: false })
        .limit(1);

      if (error) {
        this.handleError(error, `Failed to fetch specification for task '${taskId}'`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] ?? null;
    } catch (err) {
      this.handleError(err, `Failed to fetch specification for task '${taskId}'`);
    }
  }

  public async findAllVersions(taskId: string): Promise<Specification[]> {
    try {
      const { data, error } = await this.client
        .from("specifications")
        .select()
        .eq("task_id", taskId)
        .order("version", { ascending: true });

      if (error) {
        this.handleError(error, `Failed to fetch specification versions for task '${taskId}'`);
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, `Failed to fetch specification versions for task '${taskId}'`);
    }
  }

  public async createRevision(
    taskId: string,
    data: Omit<CreateSpecificationDTO, "taskId" | "version">
  ): Promise<Specification> {
    const latest = await this.findByTaskId(taskId);
    const nextVersion = (latest?.version ?? 0) + 1;

    return this.create({
      ...data,
      taskId,
      version: nextVersion,
    });
  }
}
