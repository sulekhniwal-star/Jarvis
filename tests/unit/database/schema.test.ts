import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Database Schema Migrations & Configuration", () => {
  const configPath = path.resolve(process.cwd(), "supabase/config.toml");
  const initialSchemaPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261115000001_initial_schema.sql"
  );

  it("ensures supabase/config.toml exists with required port configurations", () => {
    expect(fs.existsSync(configPath)).toBe(true);
    const configContent = fs.readFileSync(configPath, "utf-8");
    expect(configContent).toContain("port = 54321");
    expect(configContent).toContain("port = 54322");
    expect(configContent).toContain("port = 54323");
    expect(configContent).toContain('project_id = "jarvis-local"');
  });

  it("ensures initial schema migration exists and enables required extensions", () => {
    expect(fs.existsSync(initialSchemaPath)).toBe(true);
    const sql = fs.readFileSync(initialSchemaPath, "utf-8");
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "vector"');
  });

  const requiredTables = [
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

  for (const table of requiredTables) {
    it(`defines CREATE TABLE for public.${table}`, () => {
      const sql = fs.readFileSync(initialSchemaPath, "utf-8");
      const pattern = new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?public\\.${table}\\b`, "i");
      expect(pattern.test(sql)).toBe(true);
    });
  }

  it("configures pgvector HNSW indexing on public.memories", () => {
    const sql = fs.readFileSync(initialSchemaPath, "utf-8");
    expect(sql).toContain("VECTOR(1536)");
    expect(sql).toMatch(/USING hnsw \(\s*embedding vector_cosine_ops\s*\)/i);
  });
});
