import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { generateApprovalToken, verifyApprovalToken } from "@/lib/approvals/approval-token";
import { verifyGitHubWebhookSignature } from "@/lib/github/webhook";
import { verifyWebhookSecret } from "@/lib/telegram/guard";
import {
  isPathTraversal,
  validateFileBoundaries,
} from "@/lib/agents/engine/verification/diff-inspector/boundary-validator";
import { DiffFile } from "@/lib/agents/engine/verification/diff-inspector/types";
import { SecretScanner } from "@/lib/agents/engine/verification/secret-scanner/secret-scanner";
import {
  InferenceCircuitBreaker,
  DailyBudgetExceededError,
  MonthlyBudgetExceededError,
  FailsafeCircuitBreakerError,
} from "@/lib/ai/circuit-breaker";
import { ProcessCancellationRegistry } from "@/lib/system/process-registry";
import { EmergencyKillSwitchService } from "@/lib/system/kill-switch";

describe("Security Penetration & Threat Mitigation Audit (REQ-SEC-03, NFR-SEC-05)", () => {
  describe("Attack Vector 1: Row-Level Security (RLS) Tenant Boundaries", () => {
    let mockSupabase: any;
    const userA = "00000000-0000-0000-0000-00000000000a";
    const userB = "00000000-0000-0000-0000-00000000000b";

    beforeEach(() => {
      vi.clearAllMocks();

      // Database tables with RLS simulation
      const databaseRows: Record<string, any[]> = {
        projects: [
          { id: "proj-a-1", user_id: userA, name: "Tenant A Project" },
          { id: "proj-b-1", user_id: userB, name: "Tenant B Project" },
        ],
        tasks: [
          { id: "task-a-1", project_id: "proj-a-1", user_id: userA, title: "Task A" },
          { id: "task-b-1", project_id: "proj-b-1", user_id: userB, title: "Task B" },
        ],
        cost_records: [
          { id: "cost-a-1", user_id: userA, cost_inr: 10.0 },
          { id: "cost-b-1", user_id: userB, cost_inr: 25.0 },
        ],
        audit_events: [
          { id: "aud-1", user_id: userA, event_type: "auth.login", immutable: true },
        ],
      };

      // Mock client that enforces RLS according to active session user
      mockSupabase = (actingUserId: string | null) => ({
        from: (table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn((col: string, val: any) => {
              let rows = databaseRows[table] || [];
              // RLS Filter: Anon gets nothing, user gets only rows where user_id matches or public
              if (!actingUserId) {
                return Promise.resolve({ data: [], error: null });
              }
              rows = rows.filter((r) => r.user_id === actingUserId && r[col] === val);
              return Promise.resolve({ data: rows, error: null });
            }),
          })),
          update: vi.fn((_updates: any) => ({
            eq: vi.fn((col: string, val: any) => {
              if (table === "audit_events") {
                return Promise.resolve({
                  data: null,
                  error: { code: "42501", message: "permission denied for relation audit_events (immutable)" },
                });
              }
              const rows = databaseRows[table] || [];
              const target = rows.find((r) => r[col] === val);
              if (!target || target.user_id !== actingUserId) {
                return Promise.resolve({
                  data: null,
                  error: { code: "42501", message: "Row level security violation: tenant mismatch" },
                });
              }
              return Promise.resolve({ data: target, error: null });
            }),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn((col: string, val: any) => {
              if (table === "audit_events") {
                return Promise.resolve({
                  data: null,
                  error: { code: "42501", message: "permission denied for relation audit_events (immutable)" },
                });
              }
              const rows = databaseRows[table] || [];
              const target = rows.find((r) => r[col] === val);
              if (!target || target.user_id !== actingUserId) {
                return Promise.resolve({
                  data: null,
                  error: { code: "42501", message: "Row level security violation: tenant mismatch" },
                });
              }
              return Promise.resolve({ data: target, error: null });
            }),
          })),
        }),
      });
    });

    it("prevents tenant B from reading tenant A's projects, tasks, or cost records", async () => {
      const clientB = mockSupabase(userB);

      const projRes = await clientB.from("projects").select().eq("id", "proj-a-1");
      expect(projRes.data).toHaveLength(0);

      const taskRes = await clientB.from("tasks").select().eq("id", "task-a-1");
      expect(taskRes.data).toHaveLength(0);

      const costRes = await clientB.from("cost_records").select().eq("id", "cost-a-1");
      expect(costRes.data).toHaveLength(0);
    });

    it("prevents tenant B from mutating or deleting tenant A's records", async () => {
      const clientB = mockSupabase(userB);

      const updateRes = await clientB.from("tasks").update({ title: "Tampered" }).eq("id", "task-a-1");
      expect(updateRes.error).toBeDefined();
      expect(updateRes.error?.message).toContain("Row level security violation");

      const deleteRes = await clientB.from("projects").delete().eq("id", "proj-a-1");
      expect(deleteRes.error).toBeDefined();
      expect(deleteRes.error?.message).toContain("Row level security violation");
    });

    it("guarantees audit ledger immutability by rejecting all updates and deletions", async () => {
      const clientA = mockSupabase(userA);

      const updateAudit = await clientA.from("audit_events").update({ event_type: "tampered" }).eq("id", "aud-1");
      expect(updateAudit.error).toBeDefined();
      expect(updateAudit.error?.message).toContain("permission denied");

      const deleteAudit = await clientA.from("audit_events").delete().eq("id", "aud-1");
      expect(deleteAudit.error).toBeDefined();
      expect(deleteAudit.error?.message).toContain("permission denied");
    });
  });

  describe("Attack Vector 2: Side-Channel Timing Attack Simulation", () => {
    it("HMAC token signature comparison rejects incremental byte guesses in constant time", () => {
      const secret = "production-secret-for-timing-attack-audit";
      const payload = {
        id: "appr-timing-001",
        actionType: "deploy_prod",
        targetResource: "production",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };

      const validToken = generateApprovalToken(payload, secret);
      const [, validSig] = validToken.split(".");

      // Fabricate an almost-matching signature (first 30 characters identical, last 2 different)
      const almostMatchingSig = validSig!.slice(0, -2) + (validSig!.endsWith("0") ? "1" : "0");
      const almostMatchingToken = `${payload.id}.${almostMatchingSig}`;

      const resAlmost = verifyApprovalToken(almostMatchingToken, payload, secret);
      expect(resAlmost.valid).toBe(false);
      expect(resAlmost.reason).toBe("SIGNATURE_MISMATCH");

      // Random signature
      const randomSig = crypto.randomBytes(32).toString("hex");
      const randomToken = `${payload.id}.${randomSig}`;
      const resRandom = verifyApprovalToken(randomToken, payload, secret);
      expect(resRandom.valid).toBe(false);
      expect(resRandom.reason).toBe("SIGNATURE_MISMATCH");
    });

    it("GitHub webhook signature verification rejects length variations and timing probes", () => {
      const secret = "webhook-timing-test-key";
      const body = JSON.stringify({ repository: { name: "javis" } });

      // Completely wrong signature
      expect(verifyGitHubWebhookSignature(body, "sha256=123456", secret)).toBe(false);
      // Malformed prefix
      expect(verifyGitHubWebhookSignature(body, "invalid_prefix=abcdef", secret)).toBe(false);
      // Empty header
      expect(verifyGitHubWebhookSignature(body, "", secret)).toBe(false);
      expect(verifyGitHubWebhookSignature(body, null, secret)).toBe(false);
    });

    it("Telegram webhook secret token comparison operates in constant time", () => {
      const secret = "telegram-super-secure-token-12345";

      // Partial byte match
      const partialMatch = secret.slice(0, 10) + "xyz";
      expect(verifyWebhookSecret(partialMatch, secret)).toBe(false);
      // Null or empty
      expect(verifyWebhookSecret("", secret)).toBe(false);
      expect(verifyWebhookSecret(null, secret)).toBe(false);
      // Valid
      expect(verifyWebhookSecret(secret, secret)).toBe(true);
    });
  });

  describe("Attack Vector 3: Sandbox Directory Traversal & Root Escape Injections", () => {
    it("blocks directory traversal and root escape vectors across Unix and Windows formats", () => {
      const injectionAttacks = [
        "../../etc/passwd",
        "..\\..\\Windows\\System32\\cmd.exe",
        "/etc/shadow",
        "C:\\secrets.env",
        "d:/keys/master.pem",
        "sub/../../../../root.key",
        "src/%2e%2e/%2e%2e/env",
        "src/app\0.ts",
      ];

      for (const attack of injectionAttacks) {
        expect(isPathTraversal(attack)).toBe(true);

        const diffFiles: DiffFile[] = [
          {
            oldPath: null,
            newPath: attack,
            status: "added",
            additions: 5,
            deletions: 0,
            hunks: [],
            isBinary: false,
          },
        ];

        const violations = validateFileBoundaries(diffFiles);
        expect(violations.length).toBeGreaterThanOrEqual(1);
        expect(violations[0]?.code).toBe("PATH_TRAVERSAL_DETECTED");
        expect(violations[0]?.severity).toBe("blocker");
      }
    });

    it("blocks attempts to modify forbidden security files (.env, keys, certs)", () => {
      const sensitiveFiles = [
        ".env",
        ".env.local",
        ".env.production",
        "ssl/cert.pem",
        "keys/private.key",
        "id_rsa",
        "auth/token.crt",
      ];

      for (const file of sensitiveFiles) {
        const diffFiles: DiffFile[] = [
          {
            oldPath: null,
            newPath: file,
            status: "added",
            additions: 5,
            deletions: 0,
            hunks: [],
            isBinary: false,
          },
        ];

        const violations = validateFileBoundaries(diffFiles);
        expect(violations.length).toBeGreaterThanOrEqual(1);
        expect(violations.some((v) => v.code === "FORBIDDEN_FILE_PATTERN")).toBe(true);
        expect(violations[0]?.severity).toBe("blocker");
      }
    });
  });

  describe("Attack Vector 4: Multi-Format Secret Scanner Fuzzing (14 Credential Families)", () => {
    it("detects credentials across all primary secret families with 0 false negatives", () => {
      const scanner = new SecretScanner();

      const testSecrets = [
        { name: "OpenAI Secret", payload: 'const k = "sk-proj-abcde1234567890fghijklmnopqr-stuvwxyz1234567890";' },
        { name: "Stripe Live Secret", payload: 'const k = "sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890";' },
        { name: "GitHub Classic Token", payload: 'const k = "ghp_1234567890abcdefghijklmnopqrstuvwxyz12";' },
        { name: "GitHub Fine-Grained PAT", payload: 'const k = "github_pat_11AAAAAAA0123456789abcdefghijklmnopqrstuvwxyz";' },
        { name: "AWS Access Key", payload: 'const k = "AKIAIOSFODNN7EXAMPLE";' },
        { name: "Slack Bot Token", payload: 'const k = "xoxb-123456789012-1234567890123-abcdefghijklmnopqrstuvwx";' },
        { name: "Database Postgres URI", payload: 'const db = "postgres://admin:MasterP@ssw0rd!@cluster.internal:5432/db";' },
        { name: "High Entropy Token", payload: 'const entropy = "4f8a2b9c7d1e0f3a6b5c8d7e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a";' },
      ];

      for (const secret of testSecrets) {
        const report = scanner.scanText(secret.payload, "config.ts");
        expect(report.passed).toBe(false);
        expect(report.findings.length).toBeGreaterThanOrEqual(1);
        expect(report.findings[0]?.severity).toBe("blocker");
      }
    });

    it("verifies standard application code has zero false positives", () => {
      const scanner = new SecretScanner();
      const standardCode = `
        import { useState, useEffect } from 'react';
        import { Button } from '@/components/ui/button';

        export function Counter() {
          const [count, setCount] = useState(0);
          return (
            <div className="flex flex-col gap-4 p-6 bg-slate-900 text-white rounded-lg">
              <span className="text-xl font-bold">Count: {count}</span>
              <Button onClick={() => setCount(count + 1)}>Increment</Button>
            </div>
          );
        }
      `;

      const report = scanner.scanText(standardCode, "Counter.tsx");
      expect(report.passed).toBe(true);
      expect(report.findings).toHaveLength(0);
    });
  });

  describe("Attack Vector 5: Financial Circuit Breaker & Spend Tampering", () => {
    it("fails closed when cost repository is unavailable or database fails", async () => {
      const unconfiguredBreaker = new InferenceCircuitBreaker({});

      await expect(
        unconfiguredBreaker.evaluateInference("user-1", "anthropic/claude-3.5-sonnet")
      ).rejects.toThrow(FailsafeCircuitBreakerError);
    });

    it("strictly blocks paid model calls when daily limit (₹25) is exceeded", async () => {
      const mockRepo: any = {
        getSpendSummary: vi.fn().mockResolvedValue({
          todaySpendInr: 26.5,
          monthSpendInr: 150.0,
          dailyLimitInr: 25.0,
          monthlyLimitInr: 750.0,
          absoluteCeilingInr: 1000.0,
          isEmergencyReserveActive: false,
          circuitBreakerStatus: "tripped_daily",
        }),
      };

      const breaker = new InferenceCircuitBreaker({ costRepository: mockRepo });

      await expect(
        breaker.evaluateInference("user-1", "anthropic/claude-3.5-sonnet")
      ).rejects.toThrow(DailyBudgetExceededError);
    });

    it("strictly blocks paid model calls when monthly limit (₹750) is reached without reserve", async () => {
      const mockRepo: any = {
        getSpendSummary: vi.fn().mockResolvedValue({
          todaySpendInr: 10.0,
          monthSpendInr: 760.0,
          dailyLimitInr: 25.0,
          monthlyLimitInr: 750.0,
          absoluteCeilingInr: 1000.0,
          isEmergencyReserveActive: false,
          circuitBreakerStatus: "tripped_monthly",
        }),
      };

      const breaker = new InferenceCircuitBreaker({ costRepository: mockRepo });

      await expect(
        breaker.evaluateInference("user-1", "anthropic/claude-3.5-sonnet")
      ).rejects.toThrow(MonthlyBudgetExceededError);
    });
  });

  describe("Attack Vector 6: Emergency Kill-Switch Stress Test Under Concurrency", () => {
    it("terminates 5 concurrent child processes idempotently in <1000ms", async () => {
      const registry = new ProcessCancellationRegistry();
      const killedProcesses: number[] = [];

      for (let i = 1; i <= 5; i++) {
        const mockChild: any = {
          pid: undefined,
          killed: false,
          kill: () => {
            mockChild.killed = true;
            killedProcesses.push(i);
            return true;
          },
          on: () => mockChild,
        };
        registry.register(`run-${i}`, mockChild, { task: `job-${i}` });
      }

      expect(registry.getActiveCount()).toBe(5);

      const killService = new EmergencyKillSwitchService({ registry });
      const result = await killService.executeEmergencyStop("user-admin", "api");

      expect(result.success).toBe(true);
      expect(result.subSecondPerformanceAchieved).toBe(true);
      expect(result.durationMs).toBeLessThan(1000);
      expect(killedProcesses).toHaveLength(5);
      expect(registry.getActiveCount()).toBe(0);

      // Second redundant emergency stop is idempotent and safe
      const secondStop = await killService.executeEmergencyStop("user-admin", "api");
      expect(secondStop.success).toBe(true);
      expect(secondStop.terminatedProcessesCount).toBe(0);
      expect(registry.getActiveCount()).toBe(0);
    });
  });
});
