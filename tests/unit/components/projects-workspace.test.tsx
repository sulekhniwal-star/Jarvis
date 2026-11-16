import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectHeader } from "@/components/projects/project-header";
import { MilestoneHierarchyView } from "@/components/projects/milestone-hierarchy-view";
import { ProjectsIndexView } from "@/components/projects/projects-index-view";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

const mockProject = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Jarvis Autonomous Core",
  slug: "jarvis-core",
  description: "High-integrity autonomous software command centre",
  repository_url: "https://github.com/owner/jarvis",
  default_branch: "main",
  status: "active",
};

const mockStats = {
  totalTasks: 4,
  completedTasks: 2,
  inProgressTasks: 1,
  blockedTasks: 1,
  backlogTasks: 0,
  completionVelocity: 50,
};

const mockMilestones = [
  {
    id: "m-1",
    project_id: "11111111-1111-1111-1111-111111111111",
    title: "Phase 1: Foundation",
    description: "Core architecture setup",
    sequence_order: 1,
    status: "completed",
  },
  {
    id: "m-2",
    project_id: "11111111-1111-1111-1111-111111111111",
    title: "Phase 2: Execution",
    description: "Sandbox runner",
    sequence_order: 2,
    status: "in_progress",
  },
];

const mockTasks = [
  {
    id: "t-1",
    project_id: "11111111-1111-1111-1111-111111111111",
    milestone_id: "m-1",
    title: "Setup Vitest Suite",
    description: "Configure vitest.config.ts",
    status: "completed",
    priority: "high",
    risk_level: "low",
    estimated_cost_inr: 5.5,
  },
  {
    id: "t-2",
    project_id: "11111111-1111-1111-1111-111111111111",
    milestone_id: "m-2",
    title: "Build Ephemeral Runner",
    description: "GitHub Actions workflow dispatcher",
    status: "running",
    priority: "urgent",
    risk_level: "high",
    estimated_cost_inr: 12.0,
  },
];

describe("Project Workspace Components (REQ-UI-PROJ-01)", () => {
  describe("ProjectHeader", () => {
    it("renders project details, repository link, and completion velocity", () => {
      render(<ProjectHeader project={mockProject} stats={mockStats} />);

      expect(screen.getByRole("heading", { level: 1, name: "Jarvis Autonomous Core" })).toBeInTheDocument();
      expect(screen.getByText("jarvis-core")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText(/owner\/jarvis/)).toBeInTheDocument();
      expect(screen.getByText(/branch: main/)).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument(); // total tasks
      expect(screen.getByText("2")).toBeInTheDocument(); // completed tasks
    });
  });

  describe("MilestoneHierarchyView", () => {
    it("renders milestone hierarchy cards with sequence badges and task items", () => {
      render(
        <MilestoneHierarchyView
          milestones={mockMilestones}
          tasks={mockTasks}
        />
      );

      expect(screen.getByText("M1")).toBeInTheDocument();
      expect(screen.getByText("Phase 1: Foundation")).toBeInTheDocument();
      expect(screen.getByText("M2")).toBeInTheDocument();
      expect(screen.getByText("Phase 2: Execution")).toBeInTheDocument();

      // Tasks
      expect(screen.getByText("Setup Vitest Suite")).toBeInTheDocument();
      expect(screen.getByText("Build Ephemeral Runner")).toBeInTheDocument();
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });

    it("displays empty state when no milestones or tasks exist", () => {
      render(<MilestoneHierarchyView milestones={[]} tasks={[]} />);
      expect(screen.getByText("No Milestones or Tasks Yet")).toBeInTheDocument();
    });

    it("triggers onSelectTask callback when task is clicked", () => {
      const handleSelect = vi.fn();
      render(
        <MilestoneHierarchyView
          milestones={mockMilestones}
          tasks={mockTasks}
          onSelectTask={handleSelect}
        />
      );

      fireEvent.click(screen.getByText("Setup Vitest Suite"));
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "t-1", title: "Setup Vitest Suite" })
      );
    });
  });

  describe("ProjectsIndexView", () => {
    it("renders projects list and filters by search query", () => {
      const projects = [
        {
          ...mockProject,
          milestoneCount: 2,
          taskCount: 4,
          completedTaskCount: 2,
          completionVelocity: 50,
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          name: "Mobile Telegram Client",
          slug: "telegram-bot",
          description: "Telegram interface for Jarvis",
          status: "active",
          milestoneCount: 1,
          taskCount: 3,
          completedTaskCount: 1,
          completionVelocity: 33,
        },
      ];

      render(<ProjectsIndexView initialProjects={projects} />);

      expect(screen.getByText("Jarvis Autonomous Core")).toBeInTheDocument();
      expect(screen.getByText("Mobile Telegram Client")).toBeInTheDocument();

      // Search filter
      const searchInput = screen.getByPlaceholderText(/Search projects by name/);
      fireEvent.change(searchInput, { target: { value: "Telegram" } });

      expect(screen.queryByText("Jarvis Autonomous Core")).not.toBeInTheDocument();
      expect(screen.getByText("Mobile Telegram Client")).toBeInTheDocument();
    });
  });

  describe("CreateProjectModal", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            project: { id: "new-p", name: "New Project", slug: "new-project" },
          }),
        })
      );
    });

    it("renders form and submits project creation", async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <CreateProjectModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      expect(screen.getByText("Create New Project")).toBeInTheDocument();

      const nameInput = screen.getByPlaceholderText(/Autonomous E-Commerce Engine/);
      fireEvent.change(nameInput, { target: { value: "New Project" } });

      const submitBtn = screen.getByText("Create Project");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ name: "New Project" })
        );
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
});
