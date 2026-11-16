import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/agents/sandbox/route";
import { sandboxOrchestrator } from "@/lib/agents/engine/sandbox";

describe("GET /api/agents/sandbox", () => {
  it("returns 200 with diagnostics and supported modes", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activeMode).toBeDefined();
    expect(data.githubRunner).toBeDefined();
    expect(data.localRunner).toBeDefined();
    expect(data.supportedModes).toEqual([
      "github_actions",
      "local_process",
      "local_docker",
      "auto",
    ]);
  });

  it("handles orchestrator errors gracefully with 500 response", async () => {
    vi.spyOn(sandboxOrchestrator, "getDiagnostics").mockRejectedValueOnce(
      new Error("Sandbox failure")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("SANDBOX_DIAGNOSTICS_ERROR");
    expect(data.message).toBe("Sandbox failure");
  });
});
