import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KanbanTaskCard } from "@/components/projects/kanban-task-card";
import { ProjectKanbanBoard } from "@/components/projects/project-kanban-board";
import { TaskDetailDrawer } from "@/components/projects/task-detail-drawer";
import { CreateTaskModal } from "@/components/projects/create-task-modal";

const mockTask = {
  id: "t-100",
  project_id: "p-100",
  milestone_id: "m-100",
  title: "Build Diff Inspector",
  description: "Enforce AST file boundaries",
  status: "intake",
  priority: "high",
  risk_level: "low",
  estimated_cost_inr: 25.0,
  actual_cost_inr: 0.0,
};

const mockTasks = [
  mockTask,
  {
    id: "t-101",
    project_id: "p-100",
    milestone_id: "m-100",
    title: "Run Test Verification",
    description: "Multi-stage test harness",
    status: "running",
    priority: "critical",
    risk_level: "high",
    estimated_cost_inr: 15.0,
    actual_cost_inr: 12.0,
  },
  {
    id: "t-102",
    project_id: "p-100",
    milestone_id: "m-100",
    title: "Secret Scanner Gating",
    description: "Detect entropy tokens",
    status: "awaiting_approval",
    priority: "medium",
    risk_level: "medium",
    estimated_cost_inr: 5.0,
    actual_cost_inr: 0.0,
  },
  {
    id: "t-103",
    project_id: "p-100",
    milestone_id: "m-100",
    title: "Environment Scaffold",
    description: "Next.js App Router baseline",
    status: "completed",
    priority: "low",
    risk_level: "low",
    estimated_cost_inr: 5.0,
    actual_cost_inr: 5.0,
  },
];

const mockMilestones = [
  {
    id: "m-100",
    title: "Milestone 6: Verification",
    sequence_order: 6,
  },
];

describe("Interactive Kanban & Task Drawer Components (REQ-UI-PROJ-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("KanbanTaskCard", () => {
    it("renders task details, priority, and milestone name", () => {
      render(
        <KanbanTaskCard
          task={mockTask}
          milestoneName="M6: Verification"
        />
      );

      expect(screen.getByText("Build Diff Inspector")).toBeInTheDocument();
      expect(screen.getByText("Enforce AST file boundaries")).toBeInTheDocument();
      expect(screen.getByText("high")).toBeInTheDocument();
      expect(screen.getByText("M6: Verification")).toBeInTheDocument();
    });

    it("triggers onOpenDetail when card is clicked", () => {
      const handleOpen = vi.fn();
      render(
        <KanbanTaskCard
          task={mockTask}
          onOpenDetail={handleOpen}
        />
      );

      fireEvent.click(screen.getByText("Build Diff Inspector"));
      expect(handleOpen).toHaveBeenCalledWith(mockTask);
    });

    it("triggers onStatusTransition when next action button is clicked", () => {
      const handleTransition = vi.fn();
      render(
        <KanbanTaskCard
          task={mockTask} // status intake -> next action has Spec (specifying)
          onStatusTransition={handleTransition}
        />
      );

      const specButton = screen.getByText("Spec");
      fireEvent.click(specButton);
      expect(handleTransition).toHaveBeenCalledWith("t-100", "specifying");
    });
  });

  describe("ProjectKanbanBoard", () => {
    it("groups tasks into 4 canonical columns", () => {
      render(
        <ProjectKanbanBoard
          tasks={mockTasks}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText("Backlog")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Review & Blocked")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();

      // Check task cards in their columns
      expect(screen.getByText("Build Diff Inspector")).toBeInTheDocument();
      expect(screen.getByText("Run Test Verification")).toBeInTheDocument();
      expect(screen.getByText("Secret Scanner Gating")).toBeInTheDocument();
      expect(screen.getByText("Environment Scaffold")).toBeInTheDocument();
    });

    it("filters tasks by priority button selection", () => {
      render(
        <ProjectKanbanBoard
          tasks={mockTasks}
          milestones={mockMilestones}
        />
      );

      const criticalBtn = screen.getByRole("button", { name: "critical" });
      fireEvent.click(criticalBtn);

      expect(screen.getByText("Run Test Verification")).toBeInTheDocument();
      expect(screen.queryByText("Build Diff Inspector")).not.toBeInTheDocument();
    });
  });

  describe("TaskDetailDrawer", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            task: mockTask,
            specification: {
              version: 1,
              scope: "Diff boundary validator",
              acceptance_criteria: ["Catch out of boundary files"],
            },
            plan: {
              id: "plan-1",
              steps: [{ title: "Step 1" }],
              risk_level: "low",
            },
            runs: [],
          }),
        })
      );
    });

    it("fetches and renders task specification and plan details", async () => {
      render(
        <TaskDetailDrawer
          task={mockTask}
          milestoneName="M6: Verification"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole("heading", { level: 2, name: "Build Diff Inspector" })).toBeInTheDocument();
      expect(screen.getByText("M6: Verification")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Catch out of boundary files")).toBeInTheDocument();
        expect(screen.getByText(/Execution Plan \(1 DAG steps\)/)).toBeInTheDocument();
      });
    });

    it("triggers status transition from drawer action button", async () => {
      const handleUpdated = vi.fn();
      render(
        <TaskDetailDrawer
          task={mockTask}
          isOpen={true}
          onClose={vi.fn()}
          onTaskUpdated={handleUpdated}
        />
      );

      const specifyingBtn = await screen.findByRole("button", { name: /specifying/i });
      fireEvent.click(specifyingBtn);

      await waitFor(() => {
        expect(handleUpdated).toHaveBeenCalled();
      });
    });
  });

  describe("CreateTaskModal", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            task: { id: "new-task-1", title: "New Task Title" },
          }),
        })
      );
    });

    it("creates a new task and calls onSuccess", async () => {
      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      render(
        <CreateTaskModal
          isOpen={true}
          projectId="p-100"
          milestones={mockMilestones}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      const titleInput = screen.getByPlaceholderText(/Implement OAuth Flow/);
      fireEvent.change(titleInput, { target: { value: "New Task Title" } });

      const submitBtn = screen.getByRole("button", { name: "Add Task" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ title: "New Task Title" })
        );
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
});
