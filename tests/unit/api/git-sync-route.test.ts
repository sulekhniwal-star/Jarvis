import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/require-auth", () => ({
  requireApiAuth: vi.fn().mockResolvedValue({
    user: { id: "user-123" },
    supabase: {},
    errorResponse: null,
  }),
}));

const { mockGetSyncStatus, mockClearCache } = vi.hoisted(() => ({
  mockGetSyncStatus: vi.fn(),
  mockClearCache: vi.fn(),
}));

vi.mock("@/lib/github/sync-monitor", () => ({
  RepoSyncMonitor: vi.fn().mockImplementation(() => ({
    getSyncStatus: mockGetSyncStatus,
    clearCache: mockClearCache,
  })),
}));

import { GET, POST } from "@/app/api/git/sync/route";

describe("API /api/git/sync (REQ-GH-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStatus = {
    branch: "main",
    isMainLocked: true,
    localCommitSha: "abc1234567890",
    localShortSha: "abc1234",
    localCommitMessage: "feat: sync monitor",
    localCommitDate: "2026-11-15T23:00:00Z",
    remoteRef: "origin/main",
    remoteCommitSha: "abc1234567890",
    remoteShortSha: "abc1234",
    aheadCount: 0,
    behindCount: 0,
    status: "synced",
    isClean: true,
    uncommittedCount: 0,
    lastCheckedAt: new Date().toISOString(),
  };

  it("GET returns 200 with repository sync status", async () => {
    mockGetSyncStatus.mockResolvedValueOnce(mockStatus);

    const req = new NextRequest("http://localhost:3000/api/git/sync");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("synced");
    expect(data.branch).toBe("main");
    expect(data.isMainLocked).toBe(true);
  });

  it("POST clears cache and returns fresh status", async () => {
    mockGetSyncStatus.mockResolvedValueOnce({
      ...mockStatus,
      aheadCount: 1,
      status: "ahead",
    });

    const req = new NextRequest("http://localhost:3000/api/git/sync", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockClearCache).toHaveBeenCalled();
    const data = await res.json();
    expect(data.status).toBe("ahead");
    expect(data.aheadCount).toBe(1);
  });

  it("GET returns 500 when monitor fails", async () => {
    mockGetSyncStatus.mockRejectedValueOnce(new Error("Git execution failure"));

    const req = new NextRequest("http://localhost:3000/api/git/sync");
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("SYNC_MONITOR_ERROR");
  });
});
