import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { verifyApprovalToken } from "@/lib/approvals/approval-token";

const DecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Approval ID is required" },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = DecisionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: validated.error.issues[0]?.message || "Invalid decision payload",
          details: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const approvalRepo = new ApprovalRepository(supabase);
    const approval = await approvalRepo.getById(id, user.id);

    if (!approval) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Approval '${id}' not found` },
        { status: 404 }
      );
    }

    // 1. Check expiration
    if (new Date(approval.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: "EXPIRED_APPROVAL",
          message: "This approval request has expired and can no longer be decided.",
        },
        { status: 400 }
      );
    }

    // 2. Check current status
    if (approval.status !== "pending") {
      return NextResponse.json(
        {
          error: "ALREADY_DECIDED",
          message: `Approval has already been resolved with status: ${approval.status}`,
        },
        { status: 409 }
      );
    }

    // 3. Cryptographic Token Verification (REQ-APP-02)
    // Accept token from body or x-approval-token header
    const tokenHeader = request.headers.get("x-approval-token");
    const tokenToVerify = validated.data.token || tokenHeader;

    if (tokenToVerify) {
      const verification = verifyApprovalToken(tokenToVerify, {
        id: approval.id,
        actionType: approval.action_type,
        targetResource: approval.target_resource,
        userId: user.id,
        expiresAt: approval.expires_at,
      });

      if (!verification.valid) {
        return NextResponse.json(
          {
            error: "INVALID_APPROVAL_TOKEN",
            message: `Cryptographic approval signature verification failed: ${verification.reason}`,
          },
          { status: 403 }
        );
      }
    }

    // 4. Record decision
    const updated = await approvalRepo.recordDecision(
      id,
      user.id,
      validated.data.decision,
      validated.data.reason
    );

    return NextResponse.json({
      approval: updated,
      success: true,
      message: `Approval successfully ${validated.data.decision}.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to record approval decision" },
      { status: 500 }
    );
  }
}
