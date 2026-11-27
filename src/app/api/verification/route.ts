import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { VerificationHarness } from "@/lib/agents/engine/verification";
import { requireApiAuth } from "@/lib/auth/require-auth";

const SafeVerificationStageSchema = z.enum([
  "lint",
  "typecheck",
  "test",
  "build",
]);

const RunVerificationInputSchema = z.object({
  stages: z.array(SafeVerificationStageSchema).optional(),
  failFast: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(300000).optional(),
});

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json(
    {
      supportedStages: ["lint", "typecheck", "test", "build"],
      defaultTimeoutMs: 60000,
      defaultFailFast: true,
      description:
        "Multi-stage automated verification harness running lint, typecheck, tests, and production build checks (REQ-VR-01).",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = RunVerificationInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const harness = new VerificationHarness({
      stages: parsed.data.stages,
      failFast: parsed.data.failFast,
      timeoutMs: parsed.data.timeoutMs,
    });
    const result = await harness.runAll();

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "VERIFICATION_EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}
