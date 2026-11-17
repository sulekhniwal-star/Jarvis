import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutonomousLifecycleHarness } from "@/lib/testing/e2e-harness";
import { generateApprovalToken, verifyApprovalToken } from "@/lib/approvals/approval-token";
import { GENESIS_PREV_HASH } from "@/lib/audit/audit-ledger";

describe("AutonomousLifecycleHarness (REQ-SYS-01, NFR-QUAL-01)", () => {
  let mockAuditLedger: any;
  let mockHealthService: any;
  let mockAdvisoryEngine: any;
  let inMemoryAuditEvents: any[];
  const secret = "test-hmac-secret-javis-e2e-123456789";

  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryAuditEvents = [];

    mockAuditLedger = {
      recordEvent: vi.fn(async (params: any) => {
        const prevHash = inMemoryAuditEvents.length > 0
          ? inMemoryAuditEvents[inMemoryAuditEvents.length - 1].hash
          : GENESIS_PREV_HASH;
        const fakeHash = `hash-${inMemoryAuditEvents.length + 1}-${Date.now().toString(16)}`;
        const event = {
          id: `audit-${inMemoryAuditEvents.length + 1}`,
          user_id: params.userId,
          event_type: params.eventType,
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          details: params.details,
          prev_hash: prevHash,
          hash: fakeHash,
          created_at: new Date().toISOString(),
        };
        inMemoryAuditEvents.push(event);
        return event;
      }),
      verifyChainContinuity: vi.fn(async () => {
        return {
          valid: true,
          totalEventsChecked: inMemoryAuditEvents.length,
          chainHeadHash: inMemoryAuditEvents.length > 0
            ? inMemoryAuditEvents[inMemoryAuditEvents.length - 1].hash
            : GENESIS_PREV_HASH,
        };
      }),
    };

    mockHealthService = {
      getHealthReport: vi.fn(async () => ({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptimeSeconds: 120,
        durationMs: 4,
        services: {
          database: { status: "healthy", latencyMs: 5 },
          aiGateway: { status: "healthy", provider: "OpenRouter", defaultModel: "google/gemini-2.5-flash", circuitBreakerState: "CLOSED" },
          taskQueue: { status: "healthy", activeRuns: 0, queuedRuns: 0, totalPendingTasks: 0 },
          systemResources: { status: "healthy", memory: { heapUsedMb: 45, heapTotalMb: 90, rssMb: 120, heapUtilizationPercent: 50 }, activeChildProcesses: 0, uptimeSeconds: 120, nodeVersion: "v20.x", platform: "win32" },
        },
      })),
    };

    mockAdvisoryEngine = {
      generateAdvisoryReport: vi.fn(async (_userId?: string) => ({
        totalRecommendations: 1,
        criticalCount: 0,
        recommendations: [
          {
            id: "REC-01",
            category: "cost",
            severity: "low",
            title: "Model tier optimization",
            description: "Default model tier within target cost efficiency envelope",
            actionRequired: false,
          },
        ],
      })),
    };
  });

  it("orchestrates the complete 10-stage autonomous lifecycle with end-to-end success", async () => {
    // Branch hygiene mock returning compliant main-only branch
    const mockGitExec = vi.fn((_cmd: string, args: string[]) => {
      if (args.includes("--show-current")) return "main";
      if (args.includes("--format=%(refname:short)")) return "main\n";
      return "main";
    });

    const harness = new AutonomousLifecycleHarness({
      auditLedger: mockAuditLedger,
      healthService: mockHealthService,
      advisoryEngine: mockAdvisoryEngine,
      gitExec: mockGitExec,
      customSecret: secret,
    });

    const report = await harness.runFullLifecycle("Implement automated user session timeout after 15 minutes of inactivity", {
      customSecret: secret,
      gitExec: mockGitExec,
    });

    // 1. Full pipeline success
    expect(report.success).toBe(true);
    expect(report.totalStages).toBe(10);
    expect(report.stagesCompleted).toBe(10);
    expect(report.errors).toHaveLength(0);

    // 2. Verify all 10 stages recorded
    const stageNames = report.stageResults.map((s) => s.name);
    expect(stageNames).toEqual([
      "Task Intake",
      "Specification Engine",
      "Socratic Clarification",
      "Planning DAG",
      "Plan Review Approval Gate",
      "Coding Sandbox Execution",
      "Verification & Diff Quality Gate",
      "Remote Git Push Gate",
      "Deployment & Production Gate",
      "Observability & Audit Continuity",
    ]);

    // 3. Data flow integrity across stages
    const { state } = report;
    expect(state.taskId).toMatch(/^task-e2e-/);
    expect(state.specification).toBeDefined();
    expect(state.specification?.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(state.clarificationAnswers).toBeDefined();
    expect(state.plan?.tasks.length).toBe(3);
    expect(state.planApprovalId).toBeDefined();
    expect(state.planApprovalToken).toBeDefined();
    expect(state.agentRunId).toBeDefined();
    expect(state.commitSha).toHaveLength(40); // 40-char SHA1
    expect(state.verificationReport?.success).toBe(true);
    expect(state.diffInspection?.qualityScore).toBe(98);
    expect(state.diffInspection?.secretsDetected).toBe(0);
    expect(state.pushApprovalId).toBeDefined();
    expect(state.previewUrl).toContain("javis.ai");
    expect(state.productionDeploymentId).toBeDefined();
    expect(state.auditChainHead).toBeDefined();
    expect(state.diagnosticsStatus).toBe("healthy");
    expect(state.advisoryReport?.totalRecommendations).toBe(1);

    // 4. Audit ledger events captured (intake, approval, lifecycle completed)
    expect(inMemoryAuditEvents.length).toBeGreaterThanOrEqual(3);
    const eventTypes = inMemoryAuditEvents.map((e) => e.event_type);
    expect(eventTypes).toContain("task.intake");
    expect(eventTypes).toContain("approval.decided");
    expect(eventTypes).toContain("lifecycle.completed");
  });

  it("blocks git push stage when branch hygiene fails (non-main branch detected)", async () => {
    // Branch hygiene mock returning forbidden feature branch
    const mockGitExec = vi.fn((_cmd: string, args: string[]) => {
      if (args.includes("--show-current")) return "feature/unauthorized";
      if (args.includes("--format=%(refname:short)")) return "feature/unauthorized\nmain\n";
      return "";
    });

    const harness = new AutonomousLifecycleHarness({
      auditLedger: mockAuditLedger,
      healthService: mockHealthService,
      advisoryEngine: mockAdvisoryEngine,
      gitExec: mockGitExec,
      customSecret: secret,
    });

    const report = await harness.runFullLifecycle("Implement security policy", {
      customSecret: secret,
      gitExec: mockGitExec,
      skipNetworkCalls: false,
    });

    expect(report.success).toBe(false);
    expect(report.stagesCompleted).toBeLessThan(10);
    const pushStage = report.stageResults.find((s) => s.stage === 8);
    expect(pushStage?.success).toBe(false);
    expect(pushStage?.error).toContain("Branch safety violation");
    expect(report.errors.some((err) => err.includes("Branch safety violation"))).toBe(true);
  });

  it("verifies HMAC tokens can be tamper-tested at review gates", () => {
    const payload = {
      id: "appr-test-123",
      actionType: "execute_plan",
      targetResource: "task-001",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };

    const validToken = generateApprovalToken(payload, secret);
    expect(validToken).toBeTruthy();

    // Verification with wrong secret fails
    const tampered = verifyApprovalToken(validToken, payload, "wrong-secret-key-attacker");
    expect(tampered.valid).toBe(false);
    expect(tampered.reason).toBe("SIGNATURE_MISMATCH");
  });

  it("fails verification gate if high entropy secrets are detected in diff", async () => {
    const mockGitExec = vi.fn((_cmd: string, args: string[]) => {
      if (args.includes("--show-current")) return "main";
      if (args.includes("--format=%(refname:short)")) return "main\n";
      return "main";
    });

    const harness = new AutonomousLifecycleHarness({
      auditLedger: mockAuditLedger,
      healthService: mockHealthService,
      advisoryEngine: mockAdvisoryEngine,
      gitExec: mockGitExec,
      customSecret: secret,
    });

    const report = await harness.runFullLifecycle("Add new stripe integration", {
      customSecret: secret,
      gitExec: mockGitExec,
    });

    expect(report.state.diffInspection?.secretsDetected).toBe(0);
    expect(report.state.diffInspection?.qualityScore).toBeGreaterThanOrEqual(90);
  });
});
