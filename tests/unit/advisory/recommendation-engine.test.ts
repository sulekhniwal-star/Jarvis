import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProactiveAdvisoryEngine } from "@/lib/advisory/recommendation-engine";

describe("ProactiveAdvisoryEngine (REQ-OPS-04)", () => {
  let mockCostRepo: any;
  let mockAgentRunRepo: any;
  let mockApprovalRepo: any;
  let mockHealthService: any;
  let mockStoragePruner: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCostRepo = {
      getSpendSummary: vi.fn().mockResolvedValue({
        todaySpendInr: 85,
        monthSpendInr: 250,
        dailyLimitInr: 100,
        monthlyLimitInr: 500,
        circuitBreakerStatus: "nominal",
      }),
    };

    mockAgentRunRepo = {
      listRecentRuns: vi.fn().mockResolvedValue([
        { id: "run-1", status: "completed", exit_code: 0 },
        { id: "run-2", status: "completed", exit_code: 0 },
      ]),
    };

    mockApprovalRepo = {
      listPending: vi.fn().mockResolvedValue([]),
    };

    mockHealthService = {
      getHealthReport: vi.fn().mockResolvedValue({
        status: "healthy",
        services: {
          database: { latencyMs: 15, status: "healthy" },
          aiGateway: { circuitBreakerState: "CLOSED", provider: "OpenRouter" },
        },
      }),
    };

    mockStoragePruner = {
      runFullMaintenance: vi.fn().mockResolvedValue({
        artifactsPruned: 0,
        bytesReclaimed: 0,
        approvalsExpired: 0,
      }),
    };
  });

  it("detects budget burn warning when today's spend exceeds 80% of daily limit", async () => {
    const engine = new ProactiveAdvisoryEngine({
      costRepo: mockCostRepo,
    });

    const recs = await engine.detectCostAnomalies("usr-1");
    expect(recs).toHaveLength(1);
    expect(recs[0]?.severity).toBe("warning");
    expect(recs[0]?.category).toBe("cost_budget");
    expect(recs[0]?.title).toContain("Daily Budget Approaching Cap (80%+)");
  });

  it("detects critical anomaly when monthly circuit breaker is tripped", async () => {
    mockCostRepo.getSpendSummary.mockResolvedValue({
      todaySpendInr: 40,
      monthSpendInr: 510,
      dailyLimitInr: 100,
      monthlyLimitInr: 500,
      circuitBreakerStatus: "tripped_monthly",
    });

    const engine = new ProactiveAdvisoryEngine({ costRepo: mockCostRepo });
    const recs = await engine.detectCostAnomalies("usr-1");

    expect(recs).toHaveLength(1);
    expect(recs[0]?.severity).toBe("critical");
    expect(recs[0]?.remediation?.type).toBe("unlock_emergency_reserve");
  });

  it("detects model degradation when AI gateway circuit breaker is OPEN", async () => {
    mockHealthService.getHealthReport.mockResolvedValue({
      status: "degraded",
      services: {
        database: { latencyMs: 20 },
        aiGateway: { circuitBreakerState: "OPEN" },
      },
    });

    const engine = new ProactiveAdvisoryEngine({ healthService: mockHealthService });
    const recs = await engine.detectModelDegradation();

    expect(recs.some((r) => r.title.includes("AI Gateway Circuit Breaker Open"))).toBe(true);
    expect(recs.find((r) => r.category === "model_health")?.severity).toBe("critical");
  });

  it("detects test regressions when 2 or more recent runs failed", async () => {
    mockAgentRunRepo.listRecentRuns.mockResolvedValue([
      { id: "run-3", status: "failed", exit_code: 1, error_summary: "Vitest failed" },
      { id: "run-2", status: "failed", exit_code: 1, error_summary: "Build syntax error" },
      { id: "run-1", status: "completed", exit_code: 0 },
    ]);

    const engine = new ProactiveAdvisoryEngine({ agentRunRepo: mockAgentRunRepo });
    const recs = await engine.detectTestRegressions();

    expect(recs).toHaveLength(1);
    expect(recs[0]?.category).toBe("test_reliability");
    expect(recs[0]?.title).toContain("Repeated Test Failures");
    expect(recs[0]?.remediation?.type).toBe("retry_failed_task");
  });

  it("detects pending approvals expiring in under 2 hours", async () => {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mockApprovalRepo.listPending.mockResolvedValue([
      {
        id: "app-1",
        target_resource: "prod-deploy",
        action_type: "deploy_prod",
        expires_at: oneHourFromNow,
      },
    ]);

    const engine = new ProactiveAdvisoryEngine({ approvalRepo: mockApprovalRepo });
    const recs = await engine.detectStaleWorkItems("usr-1");

    expect(recs).toHaveLength(1);
    expect(recs[0]?.category).toBe("stale_tasks");
    expect(recs[0]?.title).toContain("Pending Approval(s) Expiring Soon");
  });

  it("detects branch hygiene violation (NFR-SEC-04)", async () => {
    const mockGitExec = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) return "main\n";
      if (args.some((a: string) => a.includes("--format="))) return "main\nfeat-experimental\n";
      return "";
    });

    const engine = new ProactiveAdvisoryEngine({ gitExec: mockGitExec });
    const recs = await engine.detectHygieneIssues();

    expect(recs.some((r) => r.category === "branch_safety")).toBe(true);
    const branchRec = recs.find((r) => r.category === "branch_safety");
    expect(branchRec?.severity).toBe("critical");
    expect(branchRec?.remediation?.type).toBe("clean_extraneous_branches");
  });

  it("prioritizes critical recommendations before warning and info in generated report", async () => {
    const mockGitExec = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) return "main\n";
      if (args.some((a: string) => a.includes("--format="))) return "main\nfeat-temp\n";
      return "";
    });

    mockStoragePruner.runFullMaintenance.mockResolvedValue({
      artifactsPruned: 5,
      bytesReclaimed: 10 * 1024 * 1024,
      approvalsExpired: 1,
    });

    const engine = new ProactiveAdvisoryEngine({
      costRepo: mockCostRepo, // Generates warning (80% spend)
      gitExec: mockGitExec, // Generates critical (branch violation)
      storagePruner: mockStoragePruner, // Generates info (storage eligible)
    });

    const report = await engine.generateAdvisoryReport("usr-1");

    expect(report.totalRecommendations).toBeGreaterThanOrEqual(3);
    expect(report.criticalCount).toBeGreaterThan(0);
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.infoCount).toBeGreaterThan(0);

    // Verify ordering: critical first, then warning, then info
    expect(report.recommendations[0]?.severity).toBe("critical");
  });
});
