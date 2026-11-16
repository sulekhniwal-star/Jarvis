import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  VerificationStageSchema,
  VerificationHarness,
} from "@/lib/agents/engine/verification";

const RunVerificationInputSchema = z.object({
  stages: z.array(VerificationStageSchema).optional(),
  failFast: z.boolean().optional(),
  customCommand: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  cwd: z.string().optional(),
});

export async function GET() {
  return NextResponse.json(
    {
      supportedStages: ["lint", "typecheck", "test", "build", "custom"],
      defaultTimeoutMs: 60000,
      defaultFailFast: true,
      description:
        "Multi-stage automated verification harness running lint, typecheck, tests, and production build checks (REQ-VR-01).",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
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

    const harness = new VerificationHarness(parsed.data);
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
