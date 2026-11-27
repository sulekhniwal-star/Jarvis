import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AICoreStatus } from "@/components/dashboard/ai-core-status";
import {
  PendingApprovalsCard,
  PendingApprovalItem,
} from "@/components/dashboard/pending-approvals-card";
import {
  ActiveProjectsList,
  ProjectItem,
} from "@/components/dashboard/active-projects-list";
import {
  RecentActivityFeed,
  ActivityEventItem,
} from "@/components/dashboard/recent-activity-feed";
import Home from "@/app/page";

describe("Dashboard Overview Modules", () => {
  describe("AICoreStatus Widget", () => {
    it("renders model details and nominal daily spend progress", () => {
      render(
        <AICoreStatus
          model="meta-llama/llama-3.3-70b-instruct:free"
          provider="OpenRouter"
          dailySpendInr={5.0}
          dailyLimitInr={25.0}
          monthlySpendInr={50.0}
          monthlyLimitInr={750.0}
        />
      );

      expect(screen.getByText("AI Core Gateway")).toBeInTheDocument();
      expect(
        screen.getByText("meta-llama/llama-3.3-70b-instruct:free")
      ).toBeInTheDocument();
      expect(screen.getByText("Free Tier")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("₹5.00 / ₹25.00")).toBeInTheDocument();

      const progress = screen.getByRole("progressbar");
      expect(progress).toHaveAttribute("aria-valuenow", "5");
      expect(progress).toHaveAttribute("aria-valuemax", "25");
    });

    it("displays budget alert when daily spend crosses 80% threshold", () => {
      render(
        <AICoreStatus
          dailySpendInr={21.0} // 21/25 = 84%
          dailyLimitInr={25.0}
        />
      );

      expect(screen.getByText("Budget Alert")).toBeInTheDocument();
      const progress = screen.getByRole("progressbar");
      expect(progress.querySelector(".bg-warning")).toBeInTheDocument();
    });

    it("displays circuit tripped when daily spend reaches 100%", () => {
      render(
        <AICoreStatus
          dailySpendInr={25.5}
          dailyLimitInr={25.0}
        />
      );

      expect(screen.getByText("Circuit Tripped")).toBeInTheDocument();
      const progress = screen.getByRole("progressbar");
      expect(progress.querySelector(".bg-danger")).toBeInTheDocument();
    });
  });

  describe("PendingApprovalsCard", () => {
    it("renders empty state when no pending approvals exist", () => {
      render(<PendingApprovalsCard approvals={[]} />);

      expect(screen.getByText("No Approvals Pending")).toBeInTheDocument();
      expect(screen.getByText("Nominal")).toBeInTheDocument();
    });

    it("renders approval items and triggers approve/reject actions", () => {
      const handleApprove = vi.fn();
      const handleReject = vi.fn();

      const approvals: PendingApprovalItem[] = [
        {
          id: "appr-1",
          actionType: "paid_ai_inference",
          targetResource: "anthropic/claude-3.5-sonnet",
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      ];

      render(
        <PendingApprovalsCard
          approvals={approvals}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      );

      expect(screen.getByText("1 Pending")).toBeInTheDocument();
      expect(screen.getByText("paid_ai_inference")).toBeInTheDocument();
      expect(
        screen.getByText("anthropic/claude-3.5-sonnet")
      ).toBeInTheDocument();

      const approveBtn = screen.getByRole("button", {
        name: "Approve paid_ai_inference",
      });
      fireEvent.click(approveBtn);
      expect(handleApprove).toHaveBeenCalledWith("appr-1");

      const rejectBtn = screen.getByRole("button", {
        name: "Reject paid_ai_inference",
      });
      fireEvent.click(rejectBtn);
      expect(handleReject).toHaveBeenCalledWith("appr-1");
    });
  });

  describe("ActiveProjectsList", () => {
    it("renders empty state when no projects exist", () => {
      render(<ActiveProjectsList projects={[]} />);

      expect(screen.getByText("No Active Projects")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Create Project" })
      ).toBeInTheDocument();
    });

    it("renders project cards with slug and task count", () => {
      const projects: ProjectItem[] = [
        {
          id: "proj-1",
          name: "Jarvis Engine",
          slug: "jarvis-engine",
          defaultBranch: "main",
          status: "active",
          taskCount: 5,
        },
      ];

      render(<ActiveProjectsList projects={projects} />);

      expect(screen.getByText("Jarvis Engine")).toBeInTheDocument();
      expect(screen.getByText("/jarvis-engine")).toBeInTheDocument();
      expect(screen.getByText("5 Tasks")).toBeInTheDocument();
      expect(screen.getByText("main")).toBeInTheDocument();
    });
  });

  describe("RecentActivityFeed", () => {
    it("renders empty state when no activity recorded", () => {
      render(<RecentActivityFeed events={[]} />);

      expect(screen.getByText("No Activity Events")).toBeInTheDocument();
    });

    it("renders chronological activity stream with commit hash", () => {
      const events: ActivityEventItem[] = [
        {
          id: "ev-1",
          type: "git_commit",
          title: "Feature commit verified",
          summary: "Implemented AI Gateway router",
          gitCommitHash: "c1a4baa12345",
          timestamp: new Date().toISOString(),
        },
      ];

      render(<RecentActivityFeed events={events} />);

      expect(screen.getByText("Feature commit verified")).toBeInTheDocument();
      expect(
        screen.getByText("Implemented AI Gateway router")
      ).toBeInTheDocument();
      expect(screen.getByText("c1a4baa")).toBeInTheDocument();
    });
  });

  describe("Home Dashboard Page", () => {
    it("renders complete integrated dashboard page without errors", async () => {
      render(await Home());

      expect(screen.getByText("System Command Center")).toBeInTheDocument();
      expect(screen.getByText("AI Core Gateway")).toBeInTheDocument();
      expect(screen.getByText("Human Approvals")).toBeInTheDocument();
      expect(screen.getByText("Active Projects")).toBeInTheDocument();
      expect(screen.getByText("Activity Stream")).toBeInTheDocument();
    });
  });
});
