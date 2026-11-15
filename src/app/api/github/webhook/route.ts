import { NextRequest, NextResponse } from "next/server";
import {
  verifyGitHubWebhookSignature,
  GitHubPushEvent,
  GitHubWorkflowRunEvent,
} from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const eventType = req.headers.get("x-github-event");
    const deliveryId = req.headers.get("x-github-delivery");

    // 1. Signature Verification
    const isValid = verifyGitHubWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn(
        `[GitHub Webhook Security] Invalid signature header '${signatureHeader}' for delivery ${deliveryId}`
      );
      return NextResponse.json(
        { error: "Invalid GitHub webhook signature" },
        { status: 401 }
      );
    }

    // 2. Parse payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // 3. Event routing
    if (eventType === "ping") {
      return NextResponse.json({ ok: true, pong: true });
    }

    if (eventType === "push") {
      const pushEvent = payload as GitHubPushEvent;

      // Branchless invariant check: verify push target
      if (pushEvent.ref !== "refs/heads/main") {
        console.warn(
          `[GitHub Webhook Warning] Non-main push event detected on ref: ${pushEvent.ref}. Jarvis policy requires main-only.`
        );
        return NextResponse.json({
          ok: true,
          warning: `Non-main push detected on ${pushEvent.ref}. Ignored by main-only policy.`,
        });
      }

      console.log(
        `[GitHub Webhook] Push to main received: commit ${pushEvent.after} by ${
          pushEvent.pusher?.name ?? "unknown"
        } (${pushEvent.commits?.length ?? 0} commits)`
      );

      return NextResponse.json({
        ok: true,
        event: "push",
        branch: "main",
        head: pushEvent.after,
        commitsCount: pushEvent.commits?.length ?? 0,
      });
    }

    if (eventType === "workflow_run") {
      const runEvent = payload as GitHubWorkflowRunEvent;
      const workflow = runEvent.workflow_run;

      console.log(
        `[GitHub Webhook] Workflow run ${workflow.id} (${workflow.name}) concluded with status: ${workflow.conclusion}`
      );

      return NextResponse.json({
        ok: true,
        event: "workflow_run",
        workflowId: workflow.id,
        conclusion: workflow.conclusion,
      });
    }

    return NextResponse.json({
      ok: true,
      ignored: true,
      event: eventType,
    });
  } catch (err) {
    console.error("[GitHub Webhook Error]", err);
    return NextResponse.json(
      { error: "Internal server error processing GitHub webhook" },
      { status: 500 }
    );
  }
}
