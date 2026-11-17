import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CostRepository, CostFilterOptions } from "@/lib/repositories/cost-repository";

const CreateCostSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  costInr: z.number().nonnegative().optional(),
  isEstimated: z.boolean().optional(),
  runId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get("model") || undefined;
    const provider = searchParams.get("provider") || undefined;
    const runId = searchParams.get("runId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : 0;

    const costRepo = new CostRepository(supabase);
    const result = await costRepo.listCostRecords(user.id, {
      model,
      provider,
      runId,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to list cost records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = CreateCostSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: validated.error.issues[0]?.message || "Invalid payload",
          details: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const costRepo = new CostRepository(supabase);
    const record = await costRepo.recordUsage(user.id, {
      provider: validated.data.provider,
      model: validated.data.model,
      promptTokens: validated.data.promptTokens,
      completionTokens: validated.data.completionTokens,
      costInr: validated.data.costInr,
      isEstimated: validated.data.isEstimated,
      runId: validated.data.runId,
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to record cost usage" },
      { status: 500 }
    );
  }
}
