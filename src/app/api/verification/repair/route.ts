import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  failureAnalyzer,
  repairPromptSynthesizer,
} from "@/lib/agents/engine/verification";

const RepairAnalysisRequestSchema = z.object({
  errorOutput: z.string({ message: "errorOutput must be a string" }),
  stageName: z.string().optional(),
  strikeNumber: z.number().int().min(1).max(3).optional().default(1),
  diffSnapshot: z.string().optional(),
  allowedFiles: z.array(z.string()).optional(),
});

export async function GET() {
  return NextResponse.json(
    {
      description:
        "Autonomous Self-Review & Bounded Repair API endpoint (REQ-VR-04). Analyzes multi-stage failure logs and synthesizes strike-tiered surgical repair instructions.",
      maxStrikes: 3,
      supportedCategories: [
        "syntax_type_error",
        "test_assertion_failure",
        "lint_violation",
        "build_failure",
        "diff_boundary_violation",
        "secret_leak_violation",
        "runtime_exception",
      ],
      recoveryPolicy:
        "Strict 3-strike budget. Upon exhaustion of strike 3, workspace automatically rolls back to pre-run git HEAD on main and dispatches a Telegram recovery alert.",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = RepairAnalysisRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      errorOutput,
      stageName,
      strikeNumber,
      diffSnapshot,
      allowedFiles,
    } = parseResult.data;

    const diagnostic = failureAnalyzer.analyze(errorOutput, stageName);
    const repairPrompt = repairPromptSynthesizer.synthesize(
      diagnostic,
      strikeNumber,
      {
        diffSnapshot,
        allowedFiles,
      }
    );

    return NextResponse.json(
      {
        diagnostic,
        repairPrompt,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "REPAIR_ANALYSIS_ERROR", message },
      { status: 500 }
    );
  }
}
