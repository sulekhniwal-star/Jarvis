import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MemoryRepository } from "@/lib/repositories/memory-repository";
import { MemoryCategory } from "@/types/database";
import { requireApiAuth } from "@/lib/auth/require-auth";

const CreateMemorySchema = z.object({
  category: z.enum([
    "user_preference",
    "project_decision",
    "architecture_pattern",
    "historical_error",
  ]),
  content: z.string().min(5, "Memory content must be at least 5 characters"),
  projectId: z.string().uuid("projectId must be a valid UUID").optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") as MemoryCategory) || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const search = searchParams.get("search") || undefined;
    const semanticQuery = searchParams.get("q") || undefined;
    const threshold = parseFloat(searchParams.get("threshold") || "0.7");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { supabase, user } = auth;
    const userId = user.id;

    const memoryRepo = new MemoryRepository(supabase);

    let memories: any[] = [];
    let total = 0;

    if (semanticQuery) {
      memories = await memoryRepo.searchSimilarMemories({
        query: semanticQuery,
        userId,
        projectId,
        category,
        matchThreshold: threshold,
        matchCount: limit,
      });
      total = memories.length;
    } else {
      const result = await memoryRepo.listMemories({
        userId,
        projectId,
        category,
        search,
        limit,
        offset,
      });
      memories = result.data;
      total = result.total;
    }

    // Compute metrics
    const userPreferences = memories.filter((m) => m.category === "user_preference").length;
    const projectDecisions = memories.filter((m) => m.category === "project_decision").length;
    const architecturePatterns = memories.filter((m) => m.category === "architecture_pattern").length;
    const historicalErrors = memories.filter((m) => m.category === "historical_error").length;

    const metrics = {
      total,
      userPreferences,
      projectDecisions,
      architecturePatterns,
      historicalErrors,
    };

    return NextResponse.json(
      {
        memories,
        total,
        limit,
        offset,
        metrics,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error?.message || "Failed to retrieve memories",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const validation = CreateMemorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const memoryRepo = new MemoryRepository(auth.supabase);
    const newMemory = await memoryRepo.createMemory({
      userId: auth.user.id,
      projectId: validation.data.projectId ?? null,
      category: validation.data.category,
      content: validation.data.content,
      metadata: validation.data.metadata,
    });

    return NextResponse.json(
      { memory: newMemory },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error?.message || "Failed to create memory",
      },
      { status: 500 }
    );
  }
}
