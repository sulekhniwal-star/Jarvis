import crypto from "crypto";

export interface GitHubPushCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  added?: string[];
  removed?: string[];
  modified?: string[];
}

export interface GitHubPushEvent {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    default_branch: string;
    html_url: string;
  };
  pusher: {
    name: string;
    email: string;
  };
  commits: GitHubPushCommit[];
  head_commit?: GitHubPushCommit;
}

export interface GitHubWorkflowRunEvent {
  action: "requested" | "completed" | "in_progress" | string;
  workflow_run: {
    id: number;
    name: string;
    head_branch: string;
    head_sha: string;
    status: string;
    conclusion: string | null;
    html_url: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
}

export interface GitHubPingEvent {
  zen?: string;
  hook_id?: number;
}

/**
 * Validates that an incoming GitHub webhook request payload was signed using the shared secret.
 * Uses timing-safe constant-time comparison to prevent timing attacks.
 */
export function verifyGitHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret?: string
): boolean {
  const webhookSecret = secret ?? process.env.GITHUB_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // If no secret configured, signature verification cannot be performed
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const signature = signatureHeader.substring("sha256=".length);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf-8")
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}
