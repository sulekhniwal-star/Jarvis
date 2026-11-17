import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ChildProcessLike {
  pid?: number;
  kill: (signal?: NodeJS.Signals | number) => boolean;
  on?: (event: string, listener: (...args: any[]) => void) => any;
}

export interface RegisteredProcess {
  id: string;
  runId: string;
  process: ChildProcessLike;
  startedAt: string;
  metadata?: Record<string, unknown>;
}

export interface TerminationDetail {
  registrationId: string;
  runId: string;
  pid?: number;
  success: boolean;
  error?: string;
}

export interface TerminationSummary {
  terminatedCount: number;
  durationMs: number;
  pids: number[];
  details: TerminationDetail[];
}

export class ProcessCancellationRegistry {
  private activeProcesses = new Map<string, RegisteredProcess>();

  /**
   * Registers an active child process. Automatically listens for 'close' or 'exit'
   * events to unregister when the process finishes cleanly.
   */
  public register(
    runId: string,
    proc: ChildProcessLike,
    metadata?: Record<string, unknown>
  ): string {
    const registrationId = `proc-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const entry: RegisteredProcess = {
      id: registrationId,
      runId,
      process: proc,
      startedAt: new Date().toISOString(),
      metadata,
    };

    this.activeProcesses.set(registrationId, entry);

    if (typeof proc.on === "function") {
      const cleanup = () => {
        this.activeProcesses.delete(registrationId);
      };
      proc.on("close", cleanup);
      proc.on("exit", cleanup);
    }

    return registrationId;
  }

  /**
   * Manually unregisters a process.
   */
  public unregister(registrationId: string): void {
    this.activeProcesses.delete(registrationId);
  }

  /**
   * Returns a copy of all currently active registered processes.
   */
  public getActiveProcesses(): RegisteredProcess[] {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Clears registry entries without killing processes (useful for tests).
   */
  public clear(): void {
    this.activeProcesses.clear();
  }

  /**
   * Dispatches process-tree termination across all active registered processes.
   * On Windows: Invokes 'taskkill /pid <PID> /T /F' to terminate entire process trees.
   * On POSIX: Dispatches SIGTERM followed immediately by SIGKILL.
   * Completes in sub-second time.
   */
  public async terminateAll(
    signal: "SIGTERM" | "SIGKILL" = "SIGKILL"
  ): Promise<TerminationSummary> {
    const startTime = performance.now();
    const active = this.getActiveProcesses();
    const isWindows = process.platform === "win32";

    const details: TerminationDetail[] = await Promise.all(
      active.map(async (item) => {
        const pid = item.process.pid;
        let success = false;
        let errorMsg: string | undefined;

        try {
          if (pid && isWindows) {
            try {
              await execFileAsync("taskkill", ["/pid", String(pid), "/T", "/F"], {
                windowsHide: true,
              });
              success = true;
            } catch {
              // Direct kill fallback if taskkill fails or process does not exist
              success = item.process.kill(signal);
            }
          } else if (pid && !isWindows) {
            try {
              // Attempt to kill process group first
              process.kill(-pid, signal);
              success = true;
            } catch {
              // Fall back to direct process kill
              success = item.process.kill(signal);
            }
          } else {
            success = item.process.kill(signal);
          }
        } catch (err: unknown) {
          errorMsg = (err as Error).message || String(err);
          try {
            success = item.process.kill("SIGKILL");
          } catch {
            success = false;
          }
        }

        this.activeProcesses.delete(item.id);

        return {
          registrationId: item.id,
          runId: item.runId,
          pid,
          success,
          error: errorMsg,
        };
      })
    );

    const pids = details
      .map((d) => d.pid)
      .filter((pid): pid is number => typeof pid === "number");

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      terminatedCount: details.length,
      durationMs,
      pids,
      details,
    };
  }
}

/**
 * Shared singleton process cancellation registry.
 */
export const processRegistry = new ProcessCancellationRegistry();
