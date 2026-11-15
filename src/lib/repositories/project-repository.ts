import { BaseRepository } from "./base";
import {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  PaginationOptions,
  PaginatedResult,
  RepositoryError,
  TablesUpdate,
} from "./types";

export class ProjectRepository extends BaseRepository {
  public static slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  public async create(userId: string, data: CreateProjectDTO): Promise<Project> {
    if (!data.name || data.name.trim().length === 0) {
      throw new RepositoryError("Project name is required.", "VALIDATION_FAILED");
    }

    const slug = ProjectRepository.slugify(data.name);

    try {
      const { data: project, error } = await this.client
        .from("projects")
        .insert({
          user_id: userId,
          name: data.name.trim(),
          slug,
          description: data.description ?? null,
          repository_url: data.repositoryUrl ?? null,
          default_branch: data.defaultBranch ?? "main",
          status: "active",
          settings: data.settings ?? {},
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create project '${data.name}'`);
      }

      return project;
    } catch (err) {
      this.handleError(err, `Failed to create project '${data.name}'`);
    }
  }

  public async getById(id: string, userId: string): Promise<Project> {
    try {
      const { data, error } = await this.client
        .from("projects")
        .select()
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) {
        this.handleError(error, `Project not found with id '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Project not found with id '${id}'`);
    }
  }

  public async getBySlug(slug: string, userId: string): Promise<Project> {
    try {
      const { data, error } = await this.client
        .from("projects")
        .select()
        .eq("slug", slug)
        .eq("user_id", userId)
        .single();

      if (error) {
        this.handleError(error, `Project not found with slug '${slug}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Project not found with slug '${slug}'`);
    }
  }

  public async list(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Project>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const sortBy = options.sortBy ?? "created_at";
    const ascending = options.sortDirection === "asc";

    try {
      const { data, error, count } = await this.client
        .from("projects")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order(sortBy, { ascending })
        .range(offset, offset + limit - 1);

      if (error) {
        this.handleError(error, "Failed to list projects");
      }

      return {
        data: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      };
    } catch (err) {
      this.handleError(err, "Failed to list projects");
    }
  }

  public async update(
    id: string,
    userId: string,
    data: UpdateProjectDTO
  ): Promise<Project> {
    try {
      const updatePayload: TablesUpdate<"projects"> = {
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) {
        updatePayload.name = data.name.trim();
        updatePayload.slug = ProjectRepository.slugify(data.name);
      }
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.repositoryUrl !== undefined) updatePayload.repository_url = data.repositoryUrl;
      if (data.defaultBranch !== undefined) updatePayload.default_branch = data.defaultBranch;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.settings !== undefined) updatePayload.settings = data.settings;

      const { data: project, error } = await this.client
        .from("projects")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to update project '${id}'`);
      }

      return project;
    } catch (err) {
      this.handleError(err, `Failed to update project '${id}'`);
    }
  }

  public async archive(id: string, userId: string): Promise<Project> {
    return this.update(id, userId, { status: "archived" });
  }
}
