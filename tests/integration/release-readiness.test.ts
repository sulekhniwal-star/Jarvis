import { describe, it, expect, vi } from "vitest";
import { ReleaseReadinessVerifier } from "../../scripts/release-verify";

describe("ReleaseReadinessVerifier & Production Release Gates (REQ-REL-01, NFR-QUAL-01)", () => {
  it("certifies release readiness when all 5 production gates are compliant", async () => {
    // Compliant gitExec mock returning strictly 'main'
    const mockGitExec = vi.fn((_cmd: string, args: string[]) => {
      if (args.includes("--show-current")) return "main";
      if (args.includes("--format=%(refname:short)")) return "main\n";
      return "main";
    });

    const verifier = new ReleaseReadinessVerifier({
      gitExec: mockGitExec,
      targetVersion: "10.0.0",
      skipHealthService: true,
    });

    const report = await verifier.verifyAll();

    expect(report.readyForRelease).toBe(true);
    expect(report.totalGates).toBe(5);
    expect(report.passedGates).toBe(5);
    expect(report.targetVersion).toBe("10.0.0");

    const gateNames = report.gates.map((g) => g.gate);
    expect(gateNames).toContain("Git Branch Safety Invariant (NFR-SEC-04)");
    expect(gateNames).toContain("Security Audit & Failsafe Controls (REQ-SEC-03)");
    expect(gateNames).toContain("WCAG 2.1 AA Accessibility Standards (REQ-UI-01)");
    expect(gateNames).toContain("System Health Diagnostics & Liveness (REQ-OPS-03)");
    expect(gateNames).toContain("Release Packaging & Version Verification (REQ-REL-01)");
  });

  it("blocks release certification when branch hygiene detects non-compliant feature branches", async () => {
    // Non-compliant gitExec mock returning unauthorized feature branch
    const mockGitExec = vi.fn((_cmd: string, args: string[]) => {
      if (args.includes("--show-current")) return "feature/unauthorized-branch";
      if (args.includes("--format=%(refname:short)")) return "feature/unauthorized-branch\nmain\n";
      return "";
    });

    const verifier = new ReleaseReadinessVerifier({
      gitExec: mockGitExec,
      targetVersion: "10.0.0",
      skipHealthService: true,
    });

    const report = await verifier.verifyAll();

    expect(report.readyForRelease).toBe(false);
    const branchGate = report.gates.find((g) => g.gate.includes("Branch Safety"));
    expect(branchGate?.passed).toBe(false);
    expect(branchGate?.details).toContain("Non-compliant");
  });

  it("blocks release certification when package version does not match target release version", async () => {
    const mockGitExec = vi.fn((_cmd: string, args: string[]) => {
      if (args.includes("--show-current")) return "main";
      if (args.includes("--format=%(refname:short)")) return "main\n";
      return "main";
    });

    const verifier = new ReleaseReadinessVerifier({
      gitExec: mockGitExec,
      targetVersion: "11.0.0-unreleased", // mismatched expected version
      skipHealthService: true,
    });

    const report = await verifier.verifyAll();

    expect(report.readyForRelease).toBe(false);
    const versionGate = report.gates.find((g) => g.gate.includes("Version Verification"));
    expect(versionGate?.passed).toBe(false);
    expect(versionGate?.details).toContain("Version mismatch");
  });
});
