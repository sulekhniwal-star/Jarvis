import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { diffInspector } from "@/lib/agents/engine/verification";
import { requireApiAuth } from "@/lib/auth/require-auth";

const DiffInspectionRequestSchema = z.object({
  diffPatch: z.string({ message: "diffPatch must be a string" }),
  allowedFilePatterns: z.array(z.string()).optional(),
  allowDeletions: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json(
    {
      description:
        "Automated Diff Inspector & Quality Gate endpoint (REQ-VR-02). Analyzes unified diff patches for file boundary enforcement, secret leakage, debug residue, and churn limits.",
      rules: {
        forbiddenExtensions: [".env", ".pem", ".key", ".pfx", ".cert", ".crt", ".id_rsa"],
        debugResiduePatterns: [
          "console.log",
          "debugger",
          "fdescribe",
          "fit",
          "test.only",
          "describe.only",
          "it.only",
        ],
        limits: {
          singleFileChurnBlocker: 800,
          totalChurnBlocker: 2000,
          totalFilesBlocker: 50,
        },
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = DiffInspectionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { diffPatch, allowedFilePatterns, allowDeletions } = parseResult.data;
    const report = diffInspector.inspect(diffPatch, {
      allowedFilePatterns,
      allowDeletions,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "DIFF_INSPECTION_ERROR", message },
      { status: 500 }
    );
  }
}
