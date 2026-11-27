"use client";

import * as React from "react";
import {
  MessageSquare,
  Plus,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Conversation, Message } from "@/lib/repositories/types";

export interface ChatWorkspaceViewProps {
  initialConversations: Conversation[];
  initialMessages?: Message[];
  initialConversationId?: string | null;
}

export function ChatWorkspaceView({
  initialConversations,
  initialMessages = [],
  initialConversationId = null,
}: ChatWorkspaceViewProps) {
  const [conversations, setConversations] = React.useState<Conversation[]>(
    initialConversations
  );
  const [activeId, setActiveId] = React.useState<string | null>(
    initialConversationId ?? initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadMessages = React.useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load conversation messages.");
      }
      setMessages(data.messages || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    void loadMessages(id);
  };

  const handleNewConversation = async () => {
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Session ${new Date().toLocaleString()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create conversation.");
      }
      const created: Conversation = data.conversation;
      setConversations((prev) => [created, ...prev]);
      setActiveId(created.id);
      setMessages([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    let targetId = activeId;
    setError(null);
    setIsSending(true);

    try {
      if (!targetId) {
        const createRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmed.slice(0, 60),
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || "Failed to create conversation.");
        }
        const created: Conversation = createData.conversation;
        setConversations((prev) => [created, ...prev]);
        setActiveId(created.id);
        targetId = created.id;
      }

      const res = await fetch(`/api/conversations/${targetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      setMessages((prev) => [...prev, data.userMessage, data.agentMessage]);
      setInput("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
      {/* Conversation Sidebar */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-surface-3">
          <CardTitle className="text-sm font-semibold">Conversations</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleNewConversation}
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-text-secondary p-3 text-center">
              No conversations yet. Send a message to start.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  activeId === conv.id
                    ? "bg-surface-2 text-accent-cyan font-semibold border border-accent-cyan/30"
                    : "text-text-secondary hover:bg-surface-2/60 hover:text-text-primary"
                }`}
              >
                <div className="truncate">{conv.title}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Active Thread */}
      <Card className="lg:col-span-3 flex flex-col">
        <CardHeader className="pb-3 border-b border-surface-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent-cyan" />
            <span>Jarvis AI Workspace</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 gap-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 min-h-[360px] max-h-[520px] pr-1">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="Start a Conversation"
                description="Ask Jarvis to analyze a task, plan architecture, or review system status."
              />
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender_type === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-surface-2 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        isUser
                          ? "bg-accent-cyan/15 border border-accent-cyan/30 text-text-primary"
                          : "bg-surface-2 border border-surface-3 text-text-primary"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-surface-2 border border-surface-3 flex items-center justify-center text-text-secondary shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-surface-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Jarvis..."
              disabled={isSending}
              aria-label="Message Jarvis"
              className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-surface-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
            <Button type="submit" disabled={isSending || !input.trim()}>
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Send</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
