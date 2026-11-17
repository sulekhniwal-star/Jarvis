import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApprovalActionBadge } from "@/components/approvals/approval-action-badge";
import {
  ApprovalRequestCard,
  EnrichedApprovalItem,
  formatTimeRemaining,
  getRiskTier,
} from "@/components/approvals/approval-request-card";
import { DecisionModal } from "@/components/approvals/decision-modal";
import { ApprovalsPortalView } from "@/components/approvals/approvals-portal-view";

const mockApprovals: EnrichedApprovalItem[] = [
  {
    id: "app-1",
    user_id: "user-1",
    task_id: "task-101",
    action_type: "git_remote_push",
    target_resource: "origin/main",
    scope: { branch: "main", commit: "abcdef1" },
    status: "pending",
    requested_at: "2026-11-17T10:00:00Z",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour remaining
    token: "app-1.signature123",
    taskTitle: "Refactor Authentication Flow",
    projectName: "Javis Core",
  },
  {
    id: "app-2",
    user_id: "user-1",
    task_id: "task-102",
    action_type: "destructive_db_mutation",
    target_resource: "postgresql://prod-db/users",
    scope: { query: "ALTER TABLE users DROP COLUMN legacy_flag" },
    status: "approved",
    decision_reason: "Verified no downtime migration script",
    decided_at: "2026-11-17T11:00:00Z",
    requested_at: "2026-11-17T10:30:00Z",
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    token: "app-2.signature456",
    taskTitle: "Database Cleanup Phase",
    projectName: "Data Pipeline",
  },
  {
    id: "app-3",
    user_id: "user-1",
    task_id: null,
    action_type: "production_deploy",
    target_resource: "https://api.javis.internal",
    scope: { env: "production", image_tag: "v1.2.0" },
    status: "rejected",
    decision_reason: "Blocker bug in staging telemetry",
    decided_at: "2026-11-17T11:15:00Z",
    requested_at: "2026-11-17T10:45:00Z",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    token: "app-3.signature789",
  },
  {
    id: "app-4",
    user_id: "user-1",
    task_id: null,
    action_type: "paid_ai_inference",
    target_resource: "anthropic/claude-3-5-sonnet",
    scope: { estimated_cost_usd: 12.5 },
    status: "expired",
    requested_at: "2026-11-16T10:00:00Z",
    expires_at: new Date(Date.now() - 10000).toISOString(), // Expired
  },
];

describe("ApprovalActionBadge Component", () => {
  it("renders distinct badges across all action types", () => {
    const { rerender } = render(<ApprovalActionBadge actionType="git_remote_push" />);
    expect(screen.getByText("Remote Push")).toBeDefined();

    rerender(<ApprovalActionBadge actionType="production_deploy" />);
    expect(screen.getByText("Deploy")).toBeDefined();

    rerender(<ApprovalActionBadge actionType="paid_ai_inference" />);
    expect(screen.getByText("Paid Inference")).toBeDefined();

    rerender(<ApprovalActionBadge actionType="destructive_db_mutation" />);
    expect(screen.getByText("DB Mutation")).toBeDefined();

    rerender(<ApprovalActionBadge actionType="external_message" />);
    expect(screen.getByText("External Message")).toBeDefined();

    rerender(<ApprovalActionBadge actionType="custom_operation" />);
    expect(screen.getByText("custom operation")).toBeDefined();
  });
});

describe("Approval Request Card & Helpers", () => {
  it("formats remaining countdown time correctly", () => {
    expect(formatTimeRemaining(0).text).toBe("Expired");
    expect(formatTimeRemaining(-500).isExpired).toBe(true);

    const oneMinute = 60 * 1000;
    const formattedShort = formatTimeRemaining(2 * oneMinute + 15 * 1000);
    expect(formattedShort.text).toBe("2m 15s");
    expect(formattedShort.isUrgent).toBe(true); // < 5m is urgent

    const twoHours = 2 * 60 * 60 * 1000 + 10 * 60 * 1000;
    const formattedHours = formatTimeRemaining(twoHours);
    expect(formattedHours.text).toBe("2h 10m");
    expect(formattedHours.isUrgent).toBe(false);

    const twoDays = 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000;
    const formattedDays = formatTimeRemaining(twoDays);
    expect(formattedDays.text).toBe("2d 4h");
  });

  it("calculates correct risk tiers", () => {
    expect(getRiskTier(mockApprovals[0]).tier).toBe("high");
    expect(getRiskTier(mockApprovals[1]).tier).toBe("critical");
    expect(getRiskTier(mockApprovals[2]).tier).toBe("critical");
  });

  it("renders card content, target resource, linked task and project details", () => {
    render(<ApprovalRequestCard approval={mockApprovals[0]} />);

    expect(screen.getByText("Remote Push")).toBeDefined();
    expect(screen.getByText("High Risk")).toBeDefined();
    expect(screen.getByText("origin/main")).toBeDefined();
    expect(screen.getByText("Refactor Authentication Flow")).toBeDefined();
    expect(screen.getByText("Javis Core")).toBeDefined();
  });

  it("renders interactive Approve and Reject buttons when status is pending", () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();

    render(
      <ApprovalRequestCard
        approval={mockApprovals[0]}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );

    const approveBtn = screen.getByTestId("approve-button");
    const rejectBtn = screen.getByTestId("reject-button");

    expect(approveBtn).toBeDefined();
    expect(rejectBtn).toBeDefined();

    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledWith(mockApprovals[0]);

    fireEvent.click(rejectBtn);
    expect(handleReject).toHaveBeenCalledWith(mockApprovals[0]);
  });

  it("displays decision details and timestamp when resolved", () => {
    render(<ApprovalRequestCard approval={mockApprovals[1]} />);

    expect(screen.getByText("Approved")).toBeDefined();
    expect(
      screen.getByText('"Verified no downtime migration script"')
    ).toBeDefined();
    expect(screen.queryByTestId("approve-button")).toBeNull();
  });

  it("displays expired status when approval has expired", () => {
    render(<ApprovalRequestCard approval={mockApprovals[3]} />);

    expect(screen.getAllByText("Expired").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("approve-button")).toBeNull();
  });
});

describe("DecisionModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders modal with operation summary and confirmation button", () => {
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        approval={mockApprovals[0]}
        decision="approved"
        onDecisionComplete={vi.fn()}
      />
    );

    expect(screen.getByText("Authorize Operation")).toBeDefined();
    expect(screen.getByText("origin/main")).toBeDefined();
    expect(screen.getByTestId("confirm-decision-button")).toBeDefined();
  });

  it("submits decision payload with cryptographic token and calls onDecisionComplete", async () => {
    const onDecisionComplete = vi.fn();
    const onClose = vi.fn();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        approval: {
          ...mockApprovals[0],
          status: "approved",
          decision_reason: "LGTM!",
          decided_at: new Date().toISOString(),
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DecisionModal
        isOpen={true}
        onClose={onClose}
        approval={mockApprovals[0]}
        decision="approved"
        onDecisionComplete={onDecisionComplete}
      />
    );

    const textarea = screen.getByPlaceholderText(
      "e.g., Verified migration plan and signed off for deployment."
    );
    fireEvent.change(textarea, { target: { value: "LGTM!" } });

    const submitBtn = screen.getByTestId("confirm-decision-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/approvals/app-1/decision",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-approval-token": "app-1.signature123",
          }),
        })
      );
      expect(onDecisionComplete).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("ApprovalsPortalView Component", () => {
  it("renders metrics cards accurately", () => {
    render(<ApprovalsPortalView initialApprovals={mockApprovals} />);

    expect(screen.getByTestId("metrics-banner")).toBeDefined();
    // 4 total: 1 pending, 1 approved, 1 rejected, 1 expired
    const banner = screen.getByTestId("metrics-banner");
    expect(banner.textContent).toContain("Total Requests");
    expect(banner.textContent).toContain("Pending");
    expect(banner.textContent).toContain("Approved");
    expect(banner.textContent).toContain("Rejected");
    expect(banner.textContent).toContain("Expired");
  });

  it("filters cards by status tabs", () => {
    render(<ApprovalsPortalView initialApprovals={mockApprovals} />);

    // Click Pending tab
    const pendingTab = screen.getByTestId("tab-pending");
    fireEvent.click(pendingTab);

    expect(screen.getByText("origin/main")).toBeDefined();
    expect(screen.queryByText("postgresql://prod-db/users")).toBeNull();

    // Click Approved tab
    const approvedTab = screen.getByTestId("tab-approved");
    fireEvent.click(approvedTab);

    expect(screen.getByText("postgresql://prod-db/users")).toBeDefined();
    expect(screen.queryByText("origin/main")).toBeNull();
  });

  it("filters cards by action type dropdown", () => {
    render(<ApprovalsPortalView initialApprovals={mockApprovals} />);

    const select = screen.getByTestId("action-type-select");
    fireEvent.change(select, { target: { value: "destructive_db_mutation" } });

    expect(screen.getByText("postgresql://prod-db/users")).toBeDefined();
    expect(screen.queryByText("origin/main")).toBeNull();
    expect(screen.queryByText("https://api.javis.internal")).toBeNull();
  });

  it("filters cards by search query", () => {
    render(<ApprovalsPortalView initialApprovals={mockApprovals} />);

    const searchInput = screen.getByTestId("approvals-search-input");
    fireEvent.change(searchInput, { target: { value: "claude-3-5" } });

    expect(screen.getByText("anthropic/claude-3-5-sonnet")).toBeDefined();
    expect(screen.queryByText("origin/main")).toBeNull();
    expect(screen.queryByText("postgresql://prod-db/users")).toBeNull();
  });

  it("displays empty state when no items match filters", () => {
    render(<ApprovalsPortalView initialApprovals={mockApprovals} />);

    const searchInput = screen.getByTestId("approvals-search-input");
    fireEvent.change(searchInput, { target: { value: "nonexistent-query-string" } });

    expect(screen.getByText("No approval requests found")).toBeDefined();
  });
});
