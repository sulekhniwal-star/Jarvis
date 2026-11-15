/**
 * TypeScript definitions for GitHub REST API v3 models.
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url?: string;
  html_url?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description: string | null;
  owner?: GitHubUser;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface GitHubCommitFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | string;
  additions: number;
  deletions: number;
  changes?: number;
  patch?: string;
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: GitHubCommitAuthor;
    committer?: GitHubCommitAuthor;
  };
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: GitHubCommitFile[];
}

export type GitHubComparisonStatus = "ahead" | "behind" | "identical" | "diverged";

export interface GitHubComparison {
  status: GitHubComparisonStatus;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubCommit[];
  files?: GitHubCommitFile[];
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: "success" | "failure" | "cancelled" | "timed_out" | "action_required" | "skipped" | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export class GitHubApiError extends Error {
  public statusCode?: number;
  public rateLimitRemaining?: number;
  public rateLimitReset?: number;
  public details?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      rateLimitRemaining?: number;
      rateLimitReset?: number;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "GitHubApiError";
    this.statusCode = options?.statusCode;
    this.rateLimitRemaining = options?.rateLimitRemaining;
    this.rateLimitReset = options?.rateLimitReset;
    this.details = options?.details;
    Object.setPrototypeOf(this, GitHubApiError.prototype);
  }
}
