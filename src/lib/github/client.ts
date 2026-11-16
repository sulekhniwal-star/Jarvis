import {
  GitHubRepository,
  GitHubBranch,
  GitHubCommit,
  GitHubComparison,
  GitHubWorkflowRun,
  GitHubApiError,
} from "./types";

export interface GitHubClientOptions {
  token?: string;
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export class GitHubClient {
  private token?: string;
  private baseUrl: string;
  private timeoutMs: number;
  private userAgent: string;

  constructor(options?: GitHubClientOptions) {
    this.token =
      options?.token ??
      process.env.GITHUB_TOKEN ??
      process.env.GITHUB_APP_TOKEN;
    this.baseUrl = (options?.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.timeoutMs = options?.timeoutMs ?? 10000;
    this.userAgent = options?.userAgent ?? "Jarvis-AI-Agent/1.0";
  }

  /**
   * Internal HTTP fetch wrapper with standard GitHub headers, timeout, and error handling.
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": this.userAgent,
      ...(options?.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining")
        ? parseInt(response.headers.get("x-ratelimit-remaining")!, 10)
        : undefined;

      const rateLimitReset = response.headers.get("x-ratelimit-reset")
        ? parseInt(response.headers.get("x-ratelimit-reset")!, 10)
        : undefined;

      let data: unknown;
      try {
        data = await response.json();
      } catch (parseErr) {
        if (!response.ok) {
          throw new GitHubApiError(
            `GitHub API request failed with status ${response.status}`,
            {
              statusCode: response.status,
              rateLimitRemaining,
              rateLimitReset,
              details: (parseErr as Error).message,
            }
          );
        }
        data = null;
      }

      if (!response.ok) {
        const errorPayload = data as { message?: string; documentation_url?: string } | null;
        const message =
          errorPayload?.message ?? `GitHub API error (${response.status})`;

        throw new GitHubApiError(message, {
          statusCode: response.status,
          rateLimitRemaining,
          rateLimitReset,
          details: data,
        });
      }

      return data as T;
    } catch (err) {
      if (err instanceof GitHubApiError) {
        throw err;
      }
      if ((err as Error).name === "AbortError") {
        throw new GitHubApiError(
          `GitHub API request timed out after ${this.timeoutMs}ms.`
        );
      }
      throw new GitHubApiError(
        `Network error contacting GitHub API: ${(err as Error).message}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Retrieves repository metadata (default branch, visibility, etc.).
   */
  public async getRepository(
    owner: string,
    repo: string
  ): Promise<GitHubRepository> {
    return this.request<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  /**
   * Retrieves branch details including the latest commit SHA.
   */
  public async getBranch(
    owner: string,
    repo: string,
    branch = "main"
  ): Promise<GitHubBranch> {
    return this.request<GitHubBranch>(`/repos/${owner}/${repo}/branches/${branch}`);
  }

  /**
   * Retrieves details of a specific commit SHA or ref.
   */
  public async getCommit(
    owner: string,
    repo: string,
    ref: string
  ): Promise<GitHubCommit> {
    return this.request<GitHubCommit>(`/repos/${owner}/${repo}/commits/${ref}`);
  }

  /**
   * Compares two commits or refs (base...head) to compute ahead/behind counts and file changes.
   */
  public async compareCommits(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<GitHubComparison> {
    return this.request<GitHubComparison>(
      `/repos/${owner}/${repo}/compare/${base}...${head}`
    );
  }

  /**
   * Lists workflow runs (CI executions) for the repository.
   */
  public async listWorkflowRuns(
    owner: string,
    repo: string,
    options?: { branch?: string; event?: string; status?: string }
  ): Promise<GitHubWorkflowRun[]> {
    const params = new URLSearchParams();
    if (options?.branch) params.set("branch", options.branch);
    if (options?.event) params.set("event", options.event);
    if (options?.status) params.set("status", options.status);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await this.request<{
      total_count: number;
      workflow_runs: GitHubWorkflowRun[];
    }>(`/repos/${owner}/${repo}/actions/runs${queryString}`);

    return response.workflow_runs ?? [];
  }

  /**
   * Dispatches a GitHub Actions workflow with inputs.
   * Note: The ref is locked strictly to 'main' (NFR-SEC-01).
   */
  public async dispatchWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    ref: string = "main",
    inputs?: Record<string, unknown>
  ): Promise<void> {
    if (ref !== "main") {
      throw new Error(
        `Branch security violation: workflow dispatch ref must strictly be 'main'. Attempted: '${ref}' (NFR-SEC-01).`
      );
    }

    await this.request<void>(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: inputs || {},
        }),
      }
    );
  }

  /**
   * Retrieves single workflow run details by run ID.
   */
  public async getWorkflowRun(
    owner: string,
    repo: string,
    runId: number
  ): Promise<GitHubWorkflowRun> {
    return this.request<GitHubWorkflowRun>(
      `/repos/${owner}/${repo}/actions/runs/${runId}`
    );
  }
}
