import * as fs from "fs";
import * as path from "path";
import {
  CodingTaskContext,
  CodingTaskResult,
  CodingTaskContextSchema,
  EngineValidationResult,
  BranchSecurityViolationError,
  ICodingAgentEngine,
} from "../types";
import { codingEngineRegistry } from "../registry";
import { ISandboxRunner, SandboxMode } from "./types";
import { sanitizeEnvironmentVariables } from "../context-synthesizer";

export interface FsOps {
  mkdir: (dirPath: string) => Promise<void> | void;
  rm: (dirPath: string) => Promise<void> | void;
  exists: (dirPath: string) => boolean;
}

export interface LocalSandboxRunnerOptions {
  codingEngine?: ICodingAgentEngine;
  workspaceRoot?: string;
  fsOps?: FsOps;
}

/**
 * LocalSandboxRunner executes coding agent runs in an isolated local scratchpad directory
 * with automatic cleanup, providing offline / development fallback (REQ-EX-03).
 */
export class LocalSandboxRunner implements ISandboxRunner {
  public readonly mode: SandboxMode = "local_process";
  private codingEngine?: ICodingAgentEngine;
  private workspaceRoot: string;
  private fsOps: FsOps;

  constructor(options: LocalSandboxRunnerOptions = {}) {
    this.codingEngine = options.codingEngine;
    this.workspaceRoot = options.workspaceRoot || path.join(process.cwd(), ".sandbox");

    this.fsOps = options.fsOps || {
      mkdir: (dirPath: string) => {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      },
      rm: (dirPath: string) => {
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      },
      exists: (dirPath: string) => fs.existsSync(dirPath),
    };
  }

  private resolveEngine(): ICodingAgentEngine {
    if (this.codingEngine) {
      return this.codingEngine;
    }
    // Fall back to registry default engine (or mock engine)
    return codingEngineRegistry.getEngine();
  }

  /**
   * Validates local runner readiness and underlying coding engine.
   */
  public async validateEnvironment(): Promise<EngineValidationResult> {
    try {
      const engine = this.resolveEngine();
      const engineValidation = await engine.validateEnvironment();

      return {
        valid: engineValidation.valid,
        engineName: `local_process (${engine.engineName})`,
        version: engineValidation.version || "1.0.0",
        details: `Local sandbox running engine '${engine.engineName}'. Workspace root: ${this.workspaceRoot}`,
      };
    } catch (err) {
      return {
        valid: false,
        engineName: "local_process",
        details: `Failed to resolve or validate coding engine: ${(err as Error).message}`,
        missingRequirements: ["Valid registered coding engine"],
      };
    }
  }

  /**
   * Executes task in an ephemeral scratchpad workspace, cleaning up upon completion.
   */
  public async execute(context: CodingTaskContext): Promise<CodingTaskResult> {
    if (context.targetBranch !== "main") {
      throw new BranchSecurityViolationError(context.targetBranch);
    }
    const validated = CodingTaskContextSchema.parse(context);

    const runWorkspace = path.join(this.workspaceRoot, validated.runId);

    // 1. Create ephemeral workspace directory
    try {
      await this.fsOps.mkdir(runWorkspace);
    } catch {
      // Continue if directory exists or fails non-critically
    }

    try {
      // 2. Sanitize environment variables to prevent master credential exposure (NFR-SEC-02)
      const sanitizedEnv = sanitizeEnvironmentVariables(
        validated.environmentVariables
      );

      const scopedContext: CodingTaskContext = {
        ...validated,
        environmentVariables: sanitizedEnv,
      };

      // 3. Delegate execution to coding engine
      const engine = this.resolveEngine();
      const result = await engine.executeTask(scopedContext);

      return result;
    } finally {
      // 4. Teardown: Clean up ephemeral sandbox workspace
      try {
        await this.fsOps.rm(runWorkspace);
      } catch {
        // Log or suppress cleanup error
      }
    }
  }
}
