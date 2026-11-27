import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { ConversationRepository } from "@/lib/repositories/conversation-repository";
import { createDefaultAIGateway } from "@/lib/ai/gateway";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { UsageLedgerService, BudgetService } from "@/lib/ai/ledger";

const SendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(10000),
  model: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const repo = new ConversationRepository(auth.supabase);
    await repo.getConversation(id, auth.user.id);
    const messages = await repo.listMessages(id);

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load messages";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = new ConversationRepository(auth.supabase);
    await repo.getConversation(id, auth.user.id);

    const userMessage = await repo.addMessage(id, {
      senderType: "user",
      content: parsed.data.content,
    });

    const history = await repo.listMessages(id, { limit: 20 });
    const gateway = createDefaultAIGateway({
      approvalRepo: new ApprovalRepository(auth.supabase),
      ledgerService: new UsageLedgerService(auth.supabase),
      budgetService: new BudgetService(auth.supabase),
    });

    const aiResponse = await gateway.complete({
      userId: auth.user.id,
      model: parsed.data.model,
      messages: [
        {
          role: "system",
          content:
            "You are Jarvis, a disciplined personal AI software engineering command center. Be concise, accurate, and security-conscious.",
        },
        ...history.map((m) => ({
          role:
            m.sender_type === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: m.content,
        })),
      ],
    });

    const agentMessage = await repo.addMessage(id, {
      senderType: "agent",
      content: aiResponse.content,
      tokenCount: aiResponse.usage.totalTokens,
      payload: {
        model: aiResponse.model,
        provider: aiResponse.provider,
        costInr: aiResponse.costInr,
      },
    });

    return NextResponse.json(
      { userMessage, agentMessage },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
