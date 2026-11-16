import { NextResponse } from "next/server";
import { sandboxOrchestrator } from "@/lib/agents/engine/sandbox";

export async function GET() {
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
