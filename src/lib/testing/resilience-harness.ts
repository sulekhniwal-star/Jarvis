import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { BoundedRepairRunner } from "../agents/engine/verification/repair/repair-runner";
import { RepairLoopState } from "../agents/engine/verification/repair/types";
import { SecretScanner } from "../agents/engine/verification/secret-scanner/secret-scanner";
import { SecretScanReport } from "../agents/engine/verification/secret-scanner/types";
import {
  InferenceCircuitBreaker,
  DailyBudgetExceededError,
  MonthlyBudgetExceededError,
} from "../ai/circuit-breaker";
import { CostRepository, CostSpendSummary, CircuitBreakerStatus } from "../repositories/cost-repository";
import { ProcessCancellationRegistry } from "../system/process-registry";
import { EmergencyKillSwitchService, KillSwitchResult } from "../system/kill-switch";
import {
  DisasterRecoveryDrill,
  RecoveryDrillResult,
  DrillOptions,
} from "../ops/recovery-drill";
import { createAdminClient } from "../supabase/admin";

export interface TestRepairSimulationResult {
  initialState: RepairLoopState;
  finalState: RepairLoopState;
  promptsGenerated: string[];
  maxStrikesReached: boolean;
  haltedCleanly: boolean;
  totalStrikes: number;
}

export interface SecretLeakSimulationResult {
  scanReport: SecretScanReport;
  blocked: boolean;
  findingsCount: number;
  detectedTypes: string[];
}

export interface BudgetOverflowSimulationResult {
  nominalAllowed: boolean;
  dailyExceededCaught: boolean;
  monthlyExceededCaught: boolean;
  reserveUnlocked: boolean;
  postUnlockAllowed: boolean;
  errorMessage?: string;
}

export interface KillSwitchSimulationResult {
  registeredPid?: number;
  stopResult: KillSwitchResult;
  cascadeSuccess: boolean;
  remainingActiveProcesses: number;
  durationMs: number;
}

export interface DisasterRecoverySimulationResult {
  drillResult: RecoveryDrillResult;
  zeroLossAchieved: boolean;
  parityMatched: boolean;
}

export interface ResilienceHarnessOptions {
  supabase?: SupabaseClient<Database>;
  costRepository?: CostRepository;
  processRegistry?: ProcessCancellationRegistry;
  gitExec?: (args: string[]) => string;
}

export class ResilienceHarness {
  private supabase?: SupabaseClient<Database>;
  private costRepo?: CostRepository;
  private processRegistry?: ProcessCancellationRegistry;
  private gitExec?: (args: string[]) => string;

  constructor(options: ResilienceHarnessOptions = {}) {
    let sb = options.supabase;
    if (!sb) {
      try {
        sb = createAdminClient();
      } catch {
        // Mock / isolated fallback
      }
    }
    this.supabase = sb;
    this.costRepo = options.costRepository;
    this.processRegistry = options.processRegistry;
    this.gitExec = options.gitExec;
  }

  /**
   * Scenario 1: Autonomous Test Regression & 3-Strike Bounding (REQ-VR-04)
   * Injects simulated test failures and asserts that the repair loop advances
   * through strikes with specialized prompts and halts deterministically at strike 3.
   */
  public async simulateTestRegressionAndRepair(
    failingOutput?: string
  ): Promise<TestRepairSimulationResult> {
    const gitMock = this.gitExec || (() => "abc1234");
    const runner = new BoundedRepairRunner({ gitExec: gitMock });

    let currentState = runner.createInitialState("base-sha-0001", 3);
    const promptsGenerated: string[] = [];

    const simulatedErrors = [
      failingOutput || "AssertionError: expected 'active' to equal 'inactive'\n at tests/unit/session.test.ts:45:10",
      "error TS2322: Type 'null' is not assignable to type 'string' in src/lib/session.ts:12:5",
      "AssertionError: Expected 200, received 500\n at tests/integration/session.test.ts:30:15",
    ];

    for (let i = 0; i < 3; i++) {
      const errOut = simulatedErrors[i]!;
      const advance = runner.advanceStrike(currentState, errOut, "test");
      currentState = advance.nextState;
      promptsGenerated.push(advance.prompt);
    }

    const maxStrikesReached = currentState.isTerminated && currentState.currentStrike >= 3;

    return {
      initialState: runner.createInitialState("base-sha-0001", 3),
      finalState: currentState,
      promptsGenerated,
      maxStrikesReached,
      haltedCleanly: maxStrikesReached && currentState.isTerminated,
      totalStrikes: currentState.currentStrike,
    };
  }

  /**
   * Scenario 2: High-Entropy Secret Detection & Push Gate Blocking (REQ-VR-03)
   * Scans diff containing synthetic secret tokens and asserts detection.
   */
  public simulateSecretLeakAttempt(injectedContent?: string): SecretLeakSimulationResult {
    const scanner = new SecretScanner();
    const contentToScan =
      injectedContent ||
      `
      // Config settings
      export const config = {
        stripeSecretKey: "sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
        openAiKey: "sk-proj-abcde1234567890fghijklmnopqr-stuvwxyz1234567890",
      };
      `;

    const scanReport = scanner.scanText(contentToScan, "src/config/secrets.ts");
    const blocked = !scanReport.passed;
    const detectedTypes = scanReport.findings.map((f) => f.name || f.secretType);

    return {
      scanReport,
      blocked,
      findingsCount: scanReport.findings.length,
      detectedTypes,
    };
  }

  /**
   * Scenario 3: Circuit Breaker Budget Overflow & Emergency Reserve Unlock (REQ-COST-02)
   * Simulates daily/monthly spend ceiling trip and verifies emergency reserve release.
   */
  public async simulateBudgetOverflowAndReserveUnlock(
    customSpend?: Partial<CostSpendSummary>
  ): Promise<BudgetOverflowSimulationResult> {
    let currentSpend = {
      todaySpendInr: customSpend?.todaySpendInr ?? 10.0,
      monthSpendInr: customSpend?.monthSpendInr ?? 100.0,
      dailyLimitInr: customSpend?.dailyLimitInr ?? 25.0,
      monthlyLimitInr: customSpend?.monthlyLimitInr ?? 750.0,
      absoluteCeilingInr: 1000.0,
      isEmergencyReserveActive: false,
      circuitBreakerStatus: (customSpend?.circuitBreakerStatus ?? "nominal") as CircuitBreakerStatus,
    };

    let reserveUnlocked = false;

    const mockRepo: any = this.costRepo || {
      getSpendSummary: async () => currentSpend,
      unlockEmergencyReserve: async () => {
        reserveUnlocked = true;
        currentSpend = {
          ...currentSpend,
          isEmergencyReserveActive: true,
          circuitBreakerStatus: "emergency_unlocked",
        };
      },
    };

    const breaker = new InferenceCircuitBreaker({ costRepository: mockRepo });

    // 1. Check nominal spend allows inference
    let nominalAllowed = false;
    try {
      const evalNominal = await breaker.evaluateInference(
        "00000000-0000-0000-0000-000000000001",
        "anthropic/claude-3-7-sonnet",
        500,
        200
      );
      nominalAllowed = evalNominal.allowed;
    } catch {
      nominalAllowed = false;
    }

    // 2. Simulate daily budget overflow
    currentSpend.todaySpendInr = 30.0; // exceeds daily limit of 25.0
    let dailyExceededCaught = false;
    try {
      await breaker.evaluateInference(
        "00000000-0000-0000-0000-000000000001",
        "anthropic/claude-3-7-sonnet",
        2000,
        1000
      );
    } catch (err) {
      if (err instanceof DailyBudgetExceededError) {
        dailyExceededCaught = true;
      }
    }

    // 3. Reset daily and simulate monthly budget overflow
    currentSpend.todaySpendInr = 5.0;
    currentSpend.monthSpendInr = 760.0; // exceeds monthly limit of 750.0
    let monthlyExceededCaught = false;
    try {
      await breaker.evaluateInference(
        "00000000-0000-0000-0000-000000000001",
        "anthropic/claude-3-7-sonnet",
        2000,
        1000
      );
    } catch (err) {
      if (err instanceof MonthlyBudgetExceededError) {
        monthlyExceededCaught = true;
      }
    }

    // 4. Unlock emergency reserve
    await mockRepo.unlockEmergencyReserve("00000000-0000-0000-0000-000000000001");

    // 5. Verify inference is now allowed post-unlock
    let postUnlockAllowed = false;
    try {
      const evalPost = await breaker.evaluateInference(
        "00000000-0000-0000-0000-000000000001",
        "anthropic/claude-3-7-sonnet",
        500,
        200
      );
      postUnlockAllowed = evalPost.allowed;
    } catch {
      postUnlockAllowed = false;
    }

    return {
      nominalAllowed,
      dailyExceededCaught,
      monthlyExceededCaught,
      reserveUnlocked,
      postUnlockAllowed,
    };
  }

  /**
   * Scenario 4: Sub-second Emergency Kill Switch Subprocess Cascade (REQ-SEC-01, REQ-SEC-02)
   * Registers a mock child process, triggers global emergency stop, and asserts
   * sub-second termination cascade and process clearance.
   */
  public async simulateEmergencyKillSwitchCascade(
    userId: string = "00000000-0000-0000-0000-000000000001"
  ): Promise<KillSwitchSimulationResult> {
    const registry = this.processRegistry || new ProcessCancellationRegistry();

    // Register a mock active process
    let wasKilled = false;

    const mockChildProcess: any = {
      pid: undefined,
      killed: false,
      kill: () => {
        wasKilled = true;
        mockChildProcess.killed = true;
        return true;
      },
      on: () => mockChildProcess,
    };

    registry.register("run-kill-test", mockChildProcess, {
      taskId: "task-kill-test",
      command: "npm test",
    });

    const killService = new EmergencyKillSwitchService({
      registry,
      supabase: this.supabase,
    });

    const stopResult = await killService.executeEmergencyStop(userId, "api");
    const remainingProcesses = registry.getActiveProcesses().length;

    return {
      registeredPid: undefined,
      stopResult,
      cascadeSuccess: wasKilled && remainingProcesses === 0,
      remainingActiveProcesses: remainingProcesses,
      durationMs: stopResult.durationMs,
    };
  }

  /**
   * Scenario 5: Disaster Recovery Zero-Loss Parity Drill (REQ-OPS-01)
   * Executes recovery drill and asserts 100% table count parity.
   */
  public async simulateDisasterRecoveryDrill(
    options?: DrillOptions
  ): Promise<DisasterRecoverySimulationResult> {
    const drill = new DisasterRecoveryDrill(this.supabase);
    const drillResult = await drill.executeDrill(options);

    const parityMatched =
      drillResult.tableReports.length > 0 &&
      drillResult.tableReports.every((r) => r.isMatch && r.missingRowsCount === 0);

    return {
      drillResult,
      zeroLossAchieved: drillResult.zeroLossAchieved,
      parityMatched,
    };
  }
}
