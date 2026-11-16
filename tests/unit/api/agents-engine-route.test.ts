import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/agents/engine/route";
import {
  codingEngineRegistry,
  MockCodingAgentEngine,
} from "@/lib/agents/engine";

describe("GET /api/agents/engine", () => {
  beforeEach(() => {
    codingEngineRegistry.clear();
  });

  it("registers default mock engine if registry is empty and returns 200", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.engines).toContain("mock");
    expect(data.defaultEngine).toBe("mock");
    expect(data.validation).toBeDefined();
    expect(data.validation.mock).toBeDefined();
    expect(data.validation.mock.valid).toBe(true);
  });

  it("returns all registered engines and their validation statuses", async () => {
    codingEngineRegistry.registerEngine(
      new MockCodingAgentEngine({ engineName: "custom-engine-1" })
    );
    codingEngineRegistry.registerEngine(
      new MockCodingAgentEngine({
        engineName: "custom-engine-2",
        validationResult: {
          valid: false,
          engineName: "custom-engine-2",
          details: "Configuration missing",
        },
      })
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.engines).toEqual(["custom-engine-1", "custom-engine-2"]);
    expect(data.defaultEngine).toBe("custom-engine-1");
    expect(data.validation["custom-engine-1"].valid).toBe(true);
    expect(data.validation["custom-engine-2"].valid).toBe(false);
    expect(data.validation["custom-engine-2"].details).toBe("Configuration missing");
  });

  it("handles registry errors gracefully with 500 response", async () => {
    vi.spyOn(codingEngineRegistry, "validateAll").mockRejectedValueOnce(
      new Error("Registry failure")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("ENGINE_REGISTRY_ERROR");
    expect(data.message).toBe("Registry failure");
  });
});
