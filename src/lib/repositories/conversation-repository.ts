import { BaseRepository } from "./base";
import {
  Conversation,
  Message,
  CreateConversationDTO,
  CreateMessageDTO,
  PaginationOptions,
  PaginatedResult,
  RepositoryError,
  Json,
} from "./types";

export class ConversationRepository extends BaseRepository {
  public async createConversation(
    userId: string,
    data: CreateConversationDTO
  ): Promise<Conversation> {
    if (!data.title || data.title.trim().length === 0) {
      throw new RepositoryError("Conversation title is required.", "VALIDATION_FAILED");
    }

    try {
      const { data: conversation, error } = await this.client
        .from("conversations")
        .insert({
          user_id: userId,
          project_id: data.projectId ?? null,
          title: data.title.trim(),
          channel: data.channel ?? "web",
          status: "active",
          metadata: data.metadata ?? {},
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to create conversation '${data.title}'`);
      }

      return conversation;
    } catch (err) {
      this.handleError(err, `Failed to create conversation '${data.title}'`);
    }
  }

  public async getConversation(
    id: string,
    userId: string
  ): Promise<Conversation> {
    try {
      const { data, error } = await this.client
        .from("conversations")
        .select()
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) {
        this.handleError(error, `Conversation not found with id '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Conversation not found with id '${id}'`);
    }
  }

  public async listConversations(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Conversation>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const sortBy = options.sortBy ?? "updated_at";
    const ascending = options.sortDirection === "asc";

    try {
      const { data, error, count } = await this.client
        .from("conversations")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order(sortBy, { ascending })
        .range(offset, offset + limit - 1);

      if (error) {
        this.handleError(error, "Failed to list conversations");
      }

      return {
        data: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      };
    } catch (err) {
      this.handleError(err, "Failed to list conversations");
    }
  }

  public async addMessage(
    conversationId: string,
    data: CreateMessageDTO
  ): Promise<Message> {
    if (!data.content || data.content.trim().length === 0) {
      throw new RepositoryError("Message content cannot be empty.", "VALIDATION_FAILED");
    }

    try {
      const { data: message, error } = await this.client
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: data.senderType,
          content: data.content,
          payload: data.payload ?? {},
          token_count: data.tokenCount ?? 0,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, "Failed to add message to conversation");
      }

      // Bump conversation updated_at
      await this.client
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return message;
    } catch (err) {
      this.handleError(err, "Failed to add message to conversation");
    }
  }

  public async listMessages(
    conversationId: string,
    options: PaginationOptions = {}
  ): Promise<Message[]> {
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    const sortBy = options.sortBy ?? "created_at";
    const ascending = options.sortDirection !== "desc";

    try {
      const { data, error } = await this.client
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order(sortBy, { ascending })
        .range(offset, offset + limit - 1);

      if (error) {
        this.handleError(error, `Failed to list messages for conversation '${conversationId}'`);
      }

      return data ?? [];
    } catch (err) {
      this.handleError(err, `Failed to list messages for conversation '${conversationId}'`);
    }
  }

  public async updateMetadata(
    id: string,
    userId: string,
    metadata: Json
  ): Promise<Conversation> {
    try {
      const { data, error } = await this.client
        .from("conversations")
        .update({
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to update metadata for conversation '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Failed to update metadata for conversation '${id}'`);
    }
  }

  public async archiveConversation(
    id: string,
    userId: string
  ): Promise<Conversation> {
    try {
      const { data, error } = await this.client
        .from("conversations")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to archive conversation '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Failed to archive conversation '${id}'`);
    }
  }
}
