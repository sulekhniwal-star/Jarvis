import { NextResponse } from "next/server";
import {
  codingEngineRegistry,
  MockCodingAgentEngine,
} from "@/lib/agents/engine";

export async function GET() {
  try {
    // If no engines are registered yet, register the standard mock engine as default
    if (codingEngineRegistry.listEngines().length === 0) {
      codingEngineRegistry.registerEngine(
        new MockCodingAgentEngine({ engineName: "mock" }),
        true
      );
    }

    const engines = codingEngineRegistry.listEngines();
    const defaultEngine = codingEngineRegistry.getDefaultEngineName();
    const validation = await codingEngineRegistry.validateAll();

    return NextResponse.json(
      {
        engines,
        defaultEngine,
        validation,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "ENGINE_REGISTRY_ERROR", message },
      { status: 500 }
    );
  }
}
