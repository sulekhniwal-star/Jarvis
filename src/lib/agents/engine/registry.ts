import {
  ICodingAgentEngine,
  EngineValidationResult,
  EngineNotFoundError,
} from "./types";

/**
 * Central registry managing available coding agent engines.
 */
export class CodingEngineRegistry {
  private engines = new Map<string, ICodingAgentEngine>();
  private defaultEngineName?: string;

  /**
   * Register a coding agent engine in the registry.
   * @param engine Engine instance implementing ICodingAgentEngine.
   * @param isDefault If true, sets this engine as the default fallback.
   */
  public registerEngine(
    engine: ICodingAgentEngine,
    isDefault: boolean = false
  ): void {
    if (!engine || !engine.engineName) {
      throw new Error("Invalid engine: engine and engineName are required");
    }

    const name = engine.engineName.toLowerCase();
    this.engines.set(name, engine);

    if (isDefault || !this.defaultEngineName) {
      this.defaultEngineName = name;
    }
  }

  /**
   * Look up an engine by name, or get the default registered engine.
   * @param name Optional engine identifier.
   * @throws EngineNotFoundError if engine does not exist.
   */
  public getEngine(name?: string): ICodingAgentEngine {
    const targetName = name
      ? name.toLowerCase()
      : this.defaultEngineName;

    if (!targetName || !this.engines.has(targetName)) {
      throw new EngineNotFoundError(name || "default");
    }

    return this.engines.get(targetName)!;
  }

  /**
   * Check whether an engine is registered.
   */
  public hasEngine(name: string): boolean {
    return this.engines.has(name.toLowerCase());
  }

  /**
   * Return a list of all registered engine names.
   */
  public listEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Set the default engine name.
   */
  public setDefaultEngine(name: string): void {
    const normalized = name.toLowerCase();
    if (!this.engines.has(normalized)) {
      throw new EngineNotFoundError(name);
    }
    this.defaultEngineName = normalized;
  }

  /**
   * Get the current default engine name.
   */
  public getDefaultEngineName(): string | undefined {
    return this.defaultEngineName;
  }

  /**
   * Unregister an engine from the registry.
   */
  public unregisterEngine(name: string): boolean {
    const normalized = name.toLowerCase();
    const removed = this.engines.delete(normalized);

    if (removed && this.defaultEngineName === normalized) {
      const remaining = Array.from(this.engines.keys());
      this.defaultEngineName = remaining.length > 0 ? remaining[0] : undefined;
    }

    return removed;
  }

  /**
   * Run environment validation across all registered engines in parallel.
   */
  public async validateAll(): Promise<Record<string, EngineValidationResult>> {
    const results: Record<string, EngineValidationResult> = {};
    const entries = Array.from(this.engines.entries());

    await Promise.all(
      entries.map(async ([name, engine]) => {
        try {
          results[name] = await engine.validateEnvironment();
        } catch (error) {
          results[name] = {
            valid: false,
            engineName: name,
            details: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    return results;
  }

  /**
   * Clear all registered engines and reset default selection.
   */
  public clear(): void {
    this.engines.clear();
    this.defaultEngineName = undefined;
  }
}

/**
 * Shared singleton instance of the CodingEngineRegistry.
 */
export const codingEngineRegistry = new CodingEngineRegistry();
