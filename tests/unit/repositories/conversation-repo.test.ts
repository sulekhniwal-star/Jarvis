import { describe, it, expect, vi } from "vitest";
import { ConversationRepository } from "@/lib/repositories/conversation-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("ConversationRepository", () => {
  it("throws validation error on empty conversation title", async () => {
    const mockClient = {} as SupabaseClient<Database>;
    const repo = new ConversationRepository(mockClient);

    await expect(repo.createConversation("user-1", { title: "" })).rejects.toThrow(
      /Conversation title is required/i
    );
  });

  it("adds structured message with payload to conversation", async () => {
    const fakeMessage = {
      id: "msg-1",
      conversation_id: "conv-101",
      sender_type: "agent",
      content: "Execution plan generated.",
      payload: { planId: "plan-1", steps: ["Scaffold", "Verify"] },
      token_count: 145,
      created_at: new Date().toISOString(),
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: fakeMessage, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "messages") {
        return { insert: mockInsert };
      }
      if (table === "conversations") {
        return { update: mockUpdate };
      }
      return {};
    });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new ConversationRepository(mockClient);

    const result = await repo.addMessage("conv-101", {
      senderType: "agent",
      content: "Execution plan generated.",
      payload: { planId: "plan-1", steps: ["Scaffold", "Verify"] },
      tokenCount: 145,
    });

    expect(mockFrom).toHaveBeenCalledWith("messages");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: "conv-101",
        sender_type: "agent",
        content: "Execution plan generated.",
        token_count: 145,
      })
    );
    expect(result).toEqual(fakeMessage);
  });
});
