import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Row-Level Security (RLS) Policies & Invariants", () => {
  const rlsPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261115000002_rls_policies.sql"
  );

  it("ensures RLS policies migration file exists", () => {
    expect(fs.existsSync(rlsPath)).toBe(true);
  });

  const allTables = [
    "user_profiles",
    "projects",
    "milestones",
    "tasks",
    "specifications",
    "plans",
    "approvals",
    "agent_runs",
    "run_artifacts",
    "cost_records",
    "audit_events",
    "memories",
  ];

  for (const table of allTables) {
    it(`enables ROW LEVEL SECURITY on public.${table}`, () => {
      const sql = fs.readFileSync(rlsPath, "utf-8");
      const rlsPattern = new RegExp(
        `ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`,
        "i"
      );
      expect(rlsPattern.test(sql)).toBe(true);
    });
  }

  it("enforces tenant boundary checking auth.uid() on all table policies", () => {
    const sql = fs.readFileSync(rlsPath, "utf-8");
    expect(sql).toContain("auth.uid()");

    // Assert that audit_events and cost_records have no UPDATE or DELETE policies (immutability)
    expect(sql).not.toMatch(/CREATE POLICY .* ON public\.audit_events FOR UPDATE/i);
    expect(sql).not.toMatch(/CREATE POLICY .* ON public\.audit_events FOR DELETE/i);
    expect(sql).not.toMatch(/CREATE POLICY .* ON public\.cost_records FOR UPDATE/i);
    expect(sql).not.toMatch(/CREATE POLICY .* ON public\.cost_records FOR DELETE/i);
  });

  it("permits append operations for audit_events and cost_records", () => {
    const sql = fs.readFileSync(rlsPath, "utf-8");
    expect(sql).toMatch(/CREATE POLICY [\s\S]*? ON public\.audit_events FOR INSERT/i);
    expect(sql).toMatch(/CREATE POLICY [\s\S]*? ON public\.cost_records FOR INSERT/i);
  });
});
