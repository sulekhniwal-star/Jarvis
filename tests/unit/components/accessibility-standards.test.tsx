import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TasksBacklogView } from "@/components/tasks/tasks-backlog-view";
import { Task } from "@/lib/repositories/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("WCAG 2.1 AA Accessibility Standards & Layout Ergonomics (REQ-UI-01, NFR-A11Y-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Skip Link & Landmark Roles", () => {
    it("renders skip-to-main-content link targeting #main-content", () => {
      render(
        <AppShell title="Dashboard">
          <div>Dashboard Content</div>
        </AppShell>
      );

      const skipLink = screen.getByRole("link", { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    it("renders semantic landmark roles: banner and main", () => {
      render(
        <AppShell title="Dashboard">
          <div>Dashboard Content</div>
        </AppShell>
      );

      const banner = screen.getByRole("banner");
      expect(banner).toBeInTheDocument();

      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute("id", "main-content");
    });

    it("renders sidebar with descriptive navigation aria-label", () => {
      render(<Sidebar pendingApprovalsCount={3} />);

      const sidebarNav = screen.getByRole("complementary", { name: /sidebar navigation/i });
      expect(sidebarNav).toBeInTheDocument();
    });
  });

  describe("Navigation Keyboard & Screen Reader Ergonomics", () => {
    it("applies aria-current='page' to the active navigation item", () => {
      render(<Sidebar pendingApprovalsCount={0} />);

      const tasksLink = screen.getByRole("link", { name: /tasks/i });
      expect(tasksLink).toHaveAttribute("aria-current", "page");

      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      expect(dashboardLink).not.toHaveAttribute("aria-current");
    });

    it("provides accessible labels on pending approval badge counters", () => {
      render(<Sidebar pendingApprovalsCount={5} />);

      const badge = screen.getByLabelText(/5 pending approvals requiring review/i);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("5");
    });

    it("provides accessible button controls on Topbar", () => {
      const onOpenMobileNav = vi.fn();
      render(
        <Topbar
          title="Overview"
          onOpenMobileNav={onOpenMobileNav}
          pendingApprovalsCount={2}
        />
      );

      const mobileToggle = screen.getByRole("button", { name: /open mobile navigation/i });
      expect(mobileToggle).toBeInTheDocument();

      fireEvent.click(mobileToggle);
      expect(onOpenMobileNav).toHaveBeenCalledTimes(1);

      const approvalsLink = screen.getByRole("link", { name: /2 pending approvals require review/i });
      expect(approvalsLink).toBeInTheDocument();
    });
  });

  describe("Mobile Drawer Dialog Accessibility", () => {
    it("renders dialog with aria-modal='true' and accessible close button", () => {
      const onClose = vi.fn();
      render(
        <MobileNav
          isOpen={true}
          onClose={onClose}
          pendingApprovalsCount={1}
        />
      );

      const dialog = screen.getByRole("dialog", { name: /mobile navigation menu/i });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");

      const closeButton = screen.getByRole("button", { name: /close navigation/i });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes mobile nav on Escape key press", () => {
      const onClose = vi.fn();
      render(
        <MobileNav
          isOpen={true}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Tasks Backlog View Accessibility", () => {
    const mockTasks: Task[] = [
      {
        id: "task-001",
        project_id: "proj-1",
        milestone_id: null,
        title: "Implement secure user authentication",
        description: "Add JWT authentication with timing-safe HMAC validation",
        status: "planned",
        priority: "high",
        risk_level: "low",
        estimated_cost_inr: 0,
        actual_cost_inr: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "task-002",
        project_id: "proj-1",
        milestone_id: null,
        title: "Optimize database query latency",
        description: "Add composite index on audit events",
        status: "completed",
        priority: "medium",
        risk_level: "low",
        estimated_cost_inr: 0,
        actual_cost_inr: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it("renders accessible search input and status filter controls", () => {
      render(<TasksBacklogView initialTasks={mockTasks} />);

      const searchInput = screen.getByRole("searchbox", {
        name: /search tasks by title or description/i,
      });
      expect(searchInput).toBeInTheDocument();

      const allFilter = screen.getByRole("button", { name: /^all$/i });
      expect(allFilter).toHaveAttribute("aria-pressed", "true");

      const completedFilter = screen.getByRole("button", { name: /^completed$/i });
      expect(completedFilter).toHaveAttribute("aria-pressed", "false");
    });

    it("renders task cards with descriptive accessible links to plan review", () => {
      render(<TasksBacklogView initialTasks={mockTasks} />);

      const planLink = screen.getByRole("link", {
        name: /review plan and details for task: implement secure user authentication/i,
      });
      expect(planLink).toBeInTheDocument();
      expect(planLink).toHaveAttribute("href", "/tasks/task-001/plan");
    });

    it("filters tasks dynamically upon user query", () => {
      render(<TasksBacklogView initialTasks={mockTasks} />);

      const searchInput = screen.getByRole("searchbox", {
        name: /search tasks by title or description/i,
      });

      fireEvent.change(searchInput, { target: { value: "latency" } });

      expect(screen.queryByText(/implement secure user authentication/i)).not.toBeInTheDocument();
      expect(screen.getByText(/optimize database query latency/i)).toBeInTheDocument();
    });
  });
});
