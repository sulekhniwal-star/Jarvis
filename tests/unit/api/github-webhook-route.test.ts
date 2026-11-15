import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/github/webhook/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

describe("POST /api/github/webhook", () => {
  const secret = "webhook-test-secret-123";
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GITHUB_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createSignedRequest(
    body: unknown,
    eventType: string,
    customSecret?: string
  ): NextRequest {
    const rawBody = typeof body === "string" ? body : JSON.stringify(body);
    const sec = customSecret ?? secret;
    const signature = `sha256=${crypto
      .createHmac("sha256", sec)
      .update(rawBody, "utf-8")
      .digest("hex")}`;

    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("x-hub-signature-256", signature);
    headers.set("x-github-event", eventType);
    headers.set("x-github-delivery", "guid-12345");

    return new NextRequest("http://localhost:3000/api/github/webhook", {
      method: "POST",
      headers,
      body: rawBody,
    });
  }

  it("returns 401 when signature is invalid", async () => {
    const req = createSignedRequest({ test: "data" }, "ping", "wrong-secret");
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid GitHub webhook signature");
  });

  it("returns 400 when body payload is invalid JSON", async () => {
    const rawBody = "this-is-not-valid-json";
    const signature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf-8")
      .digest("hex")}`;

    const headers = new Headers();
    headers.set("x-hub-signature-256", signature);
    headers.set("x-github-event", "ping");

    const req = new NextRequest("http://localhost:3000/api/github/webhook", {
      method: "POST",
      headers,
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON payload");
  });

  it("handles ping event with pong response", async () => {
    const req = createSignedRequest({ zen: "Design for failure", hook_id: 101 }, "ping");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.pong).toBe(true);
  });

  it("handles main push event and extracts commit details", async () => {
    const pushPayload = {
      ref: "refs/heads/main",
      before: "000000000000",
      after: "1111222233334444",
      repository: { name: "jarvis", full_name: "owner/jarvis" },
      pusher: { name: "Jarvis", email: "jarvis@ai.local" },
      commits: [
        {
          id: "1111222233334444",
          message: "feat(core): autonomous commit",
          timestamp: "2026-11-15T12:00:00Z",
          author: { name: "Jarvis", email: "jarvis@ai.local" },
        },
      ],
    };

    const req = createSignedRequest(pushPayload, "push");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.event).toBe("push");
    expect(data.branch).toBe("main");
    expect(data.head).toBe("1111222233334444");
    expect(data.commitsCount).toBe(1);
  });

  it("handles non-main push with warning indicator per branchless policy", async () => {
    const nonMainPush = {
      ref: "refs/heads/feature-branch",
      before: "000000000000",
      after: "555566667777",
      repository: { name: "jarvis", full_name: "owner/jarvis" },
      pusher: { name: "Contributor", email: "other@ai.local" },
      commits: [],
    };

    const req = createSignedRequest(nonMainPush, "push");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.warning).toContain("Non-main push detected");
  });

  it("handles workflow_run event and captures conclusion", async () => {
    const workflowPayload = {
      action: "completed",
      workflow_run: {
        id: 777888,
        name: "Test Runner",
        head_branch: "main",
        head_sha: "1111222233334444",
        status: "completed",
        conclusion: "success",
        html_url: "https://github.com/owner/jarvis/actions/runs/777888",
      },
      repository: { name: "jarvis", full_name: "owner/jarvis" },
    };

    const req = createSignedRequest(workflowPayload, "workflow_run");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.event).toBe("workflow_run");
    expect(data.workflowId).toBe(777888);
    expect(data.conclusion).toBe("success");
  });

  it("handles other events by returning ignored: true", async () => {
    const req = createSignedRequest({ action: "opened" }, "star");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.ignored).toBe(true);
    expect(data.event).toBe("star");
  });
});
