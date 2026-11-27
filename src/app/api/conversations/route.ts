import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { ConversationRepository } from "@/lib/repositories/conversation-repository";

const CreateConversationSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  projectId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "25", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const repo = new ConversationRepository(auth.supabase);
    const result = await repo.listConversations(auth.user.id, { limit, offset });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list conversations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = CreateConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = new ConversationRepository(auth.supabase);
    const conversation = await repo.createConversation(auth.user.id, {
      title: parsed.data.title,
      projectId: parsed.data.projectId ?? undefined,
      channel: "web",
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
