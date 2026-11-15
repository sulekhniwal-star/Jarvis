import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GitSyncStatusCard } from "@/components/dashboard/git-sync-status";
import { GitSyncStatus } from "@/lib/github/types";

describe("GitSyncStatusCard Component (REQ-GH-04, NFR-SEC-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseStatus: GitSyncStatus = {
    branch: "main",
    isMainLocked: true,
    localCommitSha: "1111222233334444555566667777888899990000",
    localShortSha: "1111222",
    localCommitMessage: "feat: implemented git sync card",
    localCommitDate: "2026-11-15T23:00:00Z",
    remoteRef: "origin/main",
    remoteCommitSha: "1111222233334444555566667777888899990000",
    remoteShortSha: "1111222",
    aheadCount: 0,
    behindCount: 0,
    status: "synced",
    isClean: true,
    uncommittedCount: 0,
    lastCheckedAt: new Date().toISOString(),
  };

  it("renders 'synced' state with branch lock indicator and clean working tree", () => {
    render(<GitSyncStatusCard initialStatus={baseStatus} />);

    expect(
      screen.getByText("Repository Synchronization")
    ).toBeInTheDocument();
    expect(screen.getByText("Synced with origin/main")).toBeInTheDocument();
    expect(screen.getByText("origin/main")).toBeInTheDocument();
    expect(screen.getByText("1111222")).toBeInTheDocument();
    expect(
      screen.getByText("feat: implemented git sync card")
    ).toBeInTheDocument();
    expect(screen.getByText("Clean")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("renders 'ahead' state with push pending notice and ahead count", () => {
    const aheadStatus: GitSyncStatus = {
      ...baseStatus,
      status: "ahead",
      aheadCount: 3,
      behindCount: 0,
      isClean: true,
    };

    render(<GitSyncStatusCard initialStatus={aheadStatus} />);

    expect(
      screen.getByText("3 ahead (Push Pending)")
    ).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("renders 'behind' state with sync required notice and behind count", () => {
    const behindStatus: GitSyncStatus = {
      ...baseStatus,
      status: "behind",
      aheadCount: 0,
      behindCount: 2,
    };

    render(<GitSyncStatusCard initialStatus={behindStatus} />);

    expect(
      screen.getByText("2 behind (Sync Required)")
    ).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  it("renders 'diverged' state with ahead and behind counts", () => {
    const divergedStatus: GitSyncStatus = {
      ...baseStatus,
      status: "diverged",
      aheadCount: 2,
      behindCount: 1,
    };

    render(<GitSyncStatusCard initialStatus={divergedStatus} />);

    expect(
      screen.getByText("Diverged (2 ahead, 1 behind)")
    ).toBeInTheDocument();
  });

  it("displays modified files count when working tree is dirty", () => {
    const dirtyStatus: GitSyncStatus = {
      ...baseStatus,
      isClean: false,
      uncommittedCount: 4,
    };

    render(<GitSyncStatusCard initialStatus={dirtyStatus} />);

    expect(screen.getByText("4 Modified")).toBeInTheDocument();
  });

  it("triggers refresh fetch when refresh button is clicked", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...baseStatus,
        aheadCount: 1,
        status: "ahead",
      }),
    });
    global.fetch = mockFetch;

    render(
      <GitSyncStatusCard
        initialStatus={baseStatus}
        refreshUrl="/api/git/sync"
      />
    );

    const refreshBtn = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/git/sync", {
        method: "POST",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("1 ahead (Push Pending)")
      ).toBeInTheDocument();
    });
  });
});
