import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { RepositoryError } from "./types";

export abstract class BaseRepository {
  constructor(protected readonly client: SupabaseClient<Database>) {}

  protected handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof RepositoryError) {
      throw error;
    }

    const err = error as { code?: string; message?: string; details?: unknown };
    const message = err.message ?? fallbackMessage;

    if (err.code === "PGRST116" || message.toLowerCase().includes("not found")) {
      throw new RepositoryError(message, "NOT_FOUND", err.details);
    }

    if (err.code === "23505" || message.toLowerCase().includes("unique constraint")) {
      throw new RepositoryError("A record with this identifier already exists.", "CONFLICT", err.details);
    }

    if (err.code === "42501" || message.toLowerCase().includes("policy")) {
      throw new RepositoryError("Unauthorized to perform this database operation.", "UNAUTHORIZED", err.details);
    }

    throw new RepositoryError(message, "DATABASE_ERROR", err.details);
  }
}
