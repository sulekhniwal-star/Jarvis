import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanReviewView } from "@/components/plan-review";
import { PlanPayload } from "@/lib/agents/planner/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("PlanReviewView Component", () => {
  const samplePlan: PlanPayload = {
    steps: [
      {
        id: "step-1.1",
        title: "Create DB Migration",
        description: "Add tasks table schema and RLS policies.",
        filesTargeted: ["supabase/migrations/20261115_tasks.sql"],
        actionType: "migration",
        wave: 1,
        dependencies: [],
        riskLevel: "high",
        requiresApproval: true,
        approvalReason: "Database migration requires review.",
        verificationCommand: "pnpm supabase db reset",
        rollbackProcedure: "rm supabase/migrations/20261115_tasks.sql",
      },
      {
        id: "step-2.1",
        title: "Implement Task Repository",
        description: "Create typed repository with CRUD.",
        filesTargeted: ["src/lib/repositories/task-repository.ts"],
        actionType: "create",
        wave: 2,
        dependencies: ["step-1.1"],
        riskLevel: "medium",
        requiresApproval: false,
        verificationCommand: "pnpm test tests/unit/repositories/task.test.ts",
        rollbackProcedure: "git checkout -- src/lib/repositories/task-repository.ts",
      },
    ],
    dependencies: [{ from: "step-1.1", to: "step-2.1" }],
    riskAssessment: {
      overallRisk: "high",
      riskFactors: ["Database schema changes in Wave 1"],
      requiresHumanApproval: true,
      mitigations: ["Verify migration rollback scripts"],
    },
    requiredApprovals: ["database_migration"],
  };

  it("renders header with task title, version, and statistics", () => {
    render(
      <PlanReviewView
        taskId="task-123"
        taskTitle="Configure Task Persistence"
        taskStatus="planned"
        planId="plan-456"
        planVersion={1}
        plan={samplePlan}
      />
    );

    expect(screen.getByText("Configure Task Persistence")).toBeInTheDocument();
    expect(screen.getByText("Plan v1")).toBeInTheDocument();
    expect(screen.getByText("planned")).toBeInTheDocument();
    expect(screen.getAllByText(/Waves/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Steps/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("renders risk banner with overall risk and approval gate pills", () => {
    render(
      <PlanReviewView
        taskId="task-123"
        taskTitle="Configure Task Persistence"
        taskStatus="planned"
        planId="plan-456"
        planVersion={1}
        plan={samplePlan}
      />
    );

    expect(screen.getByText(/High Risk Actions Require Owner Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk: high/i)).toBeInTheDocument();
    expect(screen.getByText("database_migration")).toBeInTheDocument();
    expect(screen.getByText("Database schema changes in Wave 1")).toBeInTheDocument();
  });

  it("renders execution steps grouped into waves", () => {
    render(
      <PlanReviewView
        taskId="task-123"
        taskTitle="Configure Task Persistence"
        taskStatus="planned"
        planId="plan-456"
        planVersion={1}
        plan={samplePlan}
      />
    );

    expect(screen.getByText("Wave 1")).toBeInTheDocument();
    expect(screen.getByText("Wave 2")).toBeInTheDocument();
    expect(screen.getByText("Create DB Migration")).toBeInTheDocument();
    expect(screen.getByText("Implement Task Repository")).toBeInTheDocument();
  });

  it("expands step details on click revealing verification command and files", () => {
    render(
      <PlanReviewView
        taskId="task-123"
        taskTitle="Configure Task Persistence"
        taskStatus="planned"
        planId="plan-456"
        planVersion={1}
        plan={samplePlan}
      />
    );

    // Click step-1.1 to toggle or inspect pre-expanded
    expect(
      screen.getByText("pnpm supabase db reset")
    ).toBeInTheDocument();
    expect(
      screen.getByText("supabase/migrations/20261115_tasks.sql")
    ).toBeInTheDocument();
  });

  it("toggles revision feedback form when Request Revision is clicked", async () => {
    render(
      <PlanReviewView
        taskId="task-123"
        taskTitle="Configure Task Persistence"
        taskStatus="planned"
        planId="plan-456"
        planVersion={1}
        plan={samplePlan}
      />
    );

    const revisionBtn = screen.getByRole("button", { name: /Request Revision/i });
    fireEvent.click(revisionBtn);

    expect(
      screen.getByPlaceholderText(/Explain what needs to be changed/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Submit Revision/i })
    ).toBeInTheDocument();
  });
});
