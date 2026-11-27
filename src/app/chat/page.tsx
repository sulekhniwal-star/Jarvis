import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { ChatWorkspaceView } from "@/components/chat/chat-workspace-view";
import { getServerAuth } from "@/lib/auth/require-auth";
import { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { Conversation, Message } from "@/lib/repositories/types";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Jarvis AI Chat">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  let conversations: Conversation[] = [];
  let initialMessages: Message[] = [];
  let initialConversationId: string | null = null;

  try {
    const repo = new ConversationRepository(supabase);
    const list = await repo.listConversations(user.id, { limit: 25 });
    conversations = list.data;

    const firstConv = conversations[0];
    if (firstConv) {
      initialConversationId = firstConv.id;
      initialMessages = await repo.listMessages(initialConversationId);
    }
  } catch {
    conversations = [];
  }

  return (
    <AppShell title="Jarvis AI Chat">
      <ErrorBoundary>
        <ChatWorkspaceView
          initialConversations={conversations}
          initialMessages={initialMessages}
          initialConversationId={initialConversationId}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
