import { NextResponse } from "next/server";
import { sandboxOrchestrator } from "@/lib/agents/engine/sandbox";
import { requireApiAuth } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const diagnostics = await sandboxOrchestrator.getDiagnostics();

    return NextResponse.json(
      {
        ...diagnostics,
        supportedModes: [
          "github_actions",
          "local_process",
          "local_docker",
          "auto",
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "SANDBOX_DIAGNOSTICS_ERROR", message },
      { status: 500 }
    );
  }
}
