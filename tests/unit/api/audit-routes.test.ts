import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listAudit, POST as createAudit } from "@/app/api/audit/route";
import { GET as verifyChain } from "@/app/api/audit/verify/route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("Audit API Routes (REQ-AUD-01)", () => {
  const mockUser = { id: "usr-test-123", email: "owner@javis.ai" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/audit", () => {
    it("returns 401 if user is unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/audit");
      const res = await listAudit(req);
      expect(res.status).toBe(401);
    });

    it("returns paginated audit records", async () => {
      const mockEvents = [
        {
          id: "evt-1",
          user_id: mockUser.id,
          event_type: "task_intake",
          resource_type: "task",
          resource_id: "task-001",
          details: { _audit: { sequence: 1, prev_hash: "0".repeat(64), hash: "h1" } },
          created_at: new Date().toISOString(),
        },
      ];

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === "audit_events") {
            const builder: any = {
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({ data: mockEvents, count: 1, error: null }),
            };
            return {
              select: vi.fn().mockReturnValue(builder),
            };
          }
          return {};
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/audit?limit=10&offset=0");
      const res = await listAudit(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.events).toHaveLength(1);
      expect(json.total).toBe(1);
      expect(json.events[0].sequence).toBe(1);
    });
  });

  describe("POST /api/audit", () => {
    it("returns 401 if user is unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/audit", {
        method: "POST",
        body: JSON.stringify({
          eventType: "test_event",
          resourceType: "test",
          resourceId: "123",
        }),
      });
      const res = await createAudit(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 on invalid payload", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/audit", {
        method: "POST",
        body: JSON.stringify({
          // Missing required resourceType and resourceId
          eventType: "test_event",
        }),
      });
      const res = await createAudit(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("VALIDATION_ERROR");
    });

    it("records audit event and returns 201", async () => {
      const insertedRow = {
        id: "evt-new-1",
        user_id: mockUser.id,
        event_type: "kill_switch_activated",
        resource_type: "system",
        resource_id: "global",
        details: {
          reason: "Manual halt",
          _audit: {
            sequence: 1,
            prev_hash: "0".repeat(64),
            hash: "abc123def456",
          },
        },
        ip_address: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      };

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === "audit_events") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/audit", {
        method: "POST",
        body: JSON.stringify({
          eventType: "kill_switch_activated",
          resourceType: "system",
          resourceId: "global",
          details: { reason: "Manual halt" },
        }),
      });
      const res = await createAudit(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBe("evt-new-1");
      expect(json.sequence).toBe(1);
    });
  });

  describe("GET /api/audit/verify", () => {
    it("returns 401 if user is unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/audit/verify");
      const res = await verifyChain(req);
      expect(res.status).toBe(401);
    });

    it("verifies chain integrity and returns result", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === "audit_events") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/audit/verify");
      const res = await verifyChain(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.isValid).toBe(true);
      expect(json.verifiedCount).toBe(0);
    });
  });
});
