import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubClient } from "@/lib/github/client";
import { GitHubApiError } from "@/lib/github/types";

describe("GitHubClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchResponse(status: number, data: any, headers: Record<string, string> = {}) {
    const headerObj = new Headers(headers);
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: headerObj,
      json: vi.fn().mockResolvedValue(data),
    });
  }

  it("sends standard GitHub headers and authorization token", async () => {
    mockFetchResponse(200, {
      id: 12345,
      name: "jarvis",
      full_name: "owner/jarvis",
      private: true,
      default_branch: "main",
      html_url: "https://github.com/owner/jarvis",
      description: "AI Developer",
    });

    const client = new GitHubClient({ token: "ghp_test_token" });
    const repo = await client.getRepository("owner", "jarvis");

    expect(repo.name).toBe("jarvis");
    expect(repo.default_branch).toBe("main");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/jarvis",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Jarvis-AI-Agent/1.0",
          Authorization: "Bearer ghp_test_token",
        }),
      })
    );
  });

  it("fetches branch details and defaults to main", async () => {
    mockFetchResponse(200, {
      name: "main",
      commit: {
        sha: "a1b2c3d4e5f6",
        url: "https://api.github.com/repos/owner/jarvis/commits/a1b2c3d4e5f6",
      },
      protected: true,
    });

    const client = new GitHubClient({ token: "test" });
    const branch = await client.getBranch("owner", "jarvis");

    expect(branch.name).toBe("main");
    expect(branch.commit.sha).toBe("a1b2c3d4e5f6");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/jarvis/branches/main",
      expect.anything()
    );
  });

  it("fetches specific commit details", async () => {
    mockFetchResponse(200, {
      sha: "commit-sha-123",
      html_url: "https://github.com/owner/jarvis/commit/commit-sha-123",
      commit: {
        message: "feat: add feature",
        author: {
          name: "Jarvis",
          email: "jarvis@ai.local",
          date: "2026-11-15T12:00:00Z",
        },
      },
      stats: { total: 10, additions: 8, deletions: 2 },
    });

    const client = new GitHubClient({ token: "test" });
    const commit = await client.getCommit("owner", "jarvis", "commit-sha-123");

    expect(commit.sha).toBe("commit-sha-123");
    expect(commit.commit.message).toBe("feat: add feature");
    expect(commit.stats?.additions).toBe(8);
  });

  it("compares two commits and parses ahead/behind divergence", async () => {
    mockFetchResponse(200, {
      status: "ahead",
      ahead_by: 3,
      behind_by: 0,
      total_commits: 3,
      commits: [
        {
          sha: "c1",
          html_url: "url1",
          commit: {
            message: "commit 1",
            author: { name: "A", email: "a@a.com", date: "2026-11-15" },
          },
        },
      ],
      files: [{ filename: "src/index.ts", status: "modified", additions: 5, deletions: 1 }],
    });

    const client = new GitHubClient({ token: "test" });
    const comparison = await client.compareCommits(
      "owner",
      "jarvis",
      "origin/main",
      "main"
    );

    expect(comparison.status).toBe("ahead");
    expect(comparison.ahead_by).toBe(3);
    expect(comparison.behind_by).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/jarvis/compare/origin/main...main",
      expect.anything()
    );
  });

  it("lists workflow runs with query parameters", async () => {
    mockFetchResponse(200, {
      total_count: 1,
      workflow_runs: [
        {
          id: 999,
          name: "CI Test Suite",
          head_branch: "main",
          head_sha: "sha1",
          status: "completed",
          conclusion: "success",
          html_url: "https://github.com/owner/jarvis/actions/runs/999",
          created_at: "2026-11-15T10:00:00Z",
          updated_at: "2026-11-15T10:02:00Z",
        },
      ],
    });

    const client = new GitHubClient({ token: "test" });
    const runs = await client.listWorkflowRuns("owner", "jarvis", {
      branch: "main",
      status: "completed",
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]!.name).toBe("CI Test Suite");
    expect(runs[0]!.conclusion).toBe("success");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/jarvis/actions/runs?branch=main&status=completed",
      expect.anything()
    );
  });

  it("throws GitHubApiError with status and rate limit details on API failure", async () => {
    mockFetchResponse(
      403,
      { message: "API rate limit exceeded for user ID 123" },
      {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1700003600",
      }
    );

    const client = new GitHubClient({ token: "test" });

    await expect(client.getRepository("owner", "jarvis")).rejects.toThrow(GitHubApiError);

    try {
      await client.getRepository("owner", "jarvis");
    } catch (err) {
      const apiErr = err as GitHubApiError;
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.rateLimitRemaining).toBe(0);
      expect(apiErr.rateLimitReset).toBe(1700003600);
      expect(apiErr.message).toContain("API rate limit exceeded");
    }
  });

  it("handles timeout abort cleanly with GitHubApiError", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const client = new GitHubClient({ token: "test", timeoutMs: 50 });
    await expect(client.getRepository("owner", "jarvis")).rejects.toThrow(
      "GitHub API request timed out"
    );
  });
});
