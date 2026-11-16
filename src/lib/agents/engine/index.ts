// Types, Schemas, and Errors
export * from "./types";

// Engine Registry
export * from "./registry";

// Mock Engine
export * from "./mock-engine";

// Context Synthesizer
export * from "./context-synthesizer";

// Aider CLI Engine
export * from "./aider/types";
export * from "./aider/config-synthesizer";
export * from "./aider/output-parser";
export * from "./aider/repair-handler";
export * from "./aider/aider-adapter";

// Sandbox Runner Environment
export * from "./sandbox/types";
export * from "./sandbox/github-actions-runner";
export * from "./sandbox/local-sandbox-runner";
export * from "./sandbox/sandbox-orchestrator";

import { codingEngineRegistry } from "./registry";
import { AiderCliAdapter } from "./aider/aider-adapter";

// Register default AiderCliAdapter in the central registry
if (!codingEngineRegistry.hasEngine("aider")) {
  codingEngineRegistry.registerEngine(new AiderCliAdapter());
}

