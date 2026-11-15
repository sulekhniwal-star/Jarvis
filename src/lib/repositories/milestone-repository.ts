import { BaseRepository } from "./base";
import {
  Milestone,
  MilestoneStatus,
  CreateMilestoneDTO,
  UpdateMilestoneDTO,
  RepositoryError,
  TablesUpdate,
} from "./types";

export class MilestoneRepository extends BaseRepository {
  public async create(
    projectId: string,
    data: CreateMilestoneDTO
  ): Promise<Milestone> {
    if (!data.title || data.title.trim().length === 0) {
      throw new RepositoryError("Milestone title is required.", "VALIDATION_FAILED");
    }

    try {
      let sequenceOrder = data.sequenceOrder;

      // Auto-calculate sequence order if not specified
      if (sequenceOrder === undefined) {
        const { data: latest } = await this.client
          .from("milestones")
          .select("sequence_order")
          .eq("project_id", projectId)
          .order("sequence_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        sequenceOrder = (latest?.sequence_order ?? -1) + 1;
      }

      const { data: milestone, error } = await this.client
        .from("milestones")
        .insert({
          project_id: projectId,
          title: data.title.trim(),
          description: data.description ?? null,
          sequence_order: sequenceOrder,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create milestone '${data.title}'`);
      }

      return milestone;
    } catch (err) {
      this.handleError(err, `Failed to create milestone '${data.title}'`);
    }
  }

  public async getById(id: string): Promise<Milestone> {
    try {
      const { data, error } = await this.client
        .from("milestones")
        .select()
        .eq("id", id)
        .single();

      if (error) {
        this.handleError(error, `Milestone not found with id '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Milestone not found with id '${id}'`);
    }
  }

  public async listByProject(projectId: string): Promise<Milestone[]> {
    try {
      const { data, error } = await this.client
        .from("milestones")
        .select()
        .eq("project_id", projectId)
        .order("sequence_order", { ascending: true });

      if (error) {
        this.handleError(error, `Failed to list milestones for project '${projectId}'`);
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, `Failed to list milestones for project '${projectId}'`);
    }
  }

  public async update(id: string, data: UpdateMilestoneDTO): Promise<Milestone> {
    try {
      const updatePayload: TablesUpdate<"milestones"> = {
        updated_at: new Date().toISOString(),
      };

      if (data.title !== undefined) updatePayload.title = data.title.trim();
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.sequenceOrder !== undefined) updatePayload.sequence_order = data.sequenceOrder;
      if (data.status !== undefined) updatePayload.status = data.status;

      const { data: milestone, error } = await this.client
        .from("milestones")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to update milestone '${id}'`);
      }

      return milestone;
    } catch (err) {
      this.handleError(err, `Failed to update milestone '${id}'`);
    }
  }

  public async updateStatus(id: string, status: MilestoneStatus): Promise<Milestone> {
    return this.update(id, { status });
  }
}
