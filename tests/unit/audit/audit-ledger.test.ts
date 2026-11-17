import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AuditLedgerService,
  canonicalizeJson,
  computeBlockHash,
  GENESIS_PREV_HASH,
} from "@/lib/audit/audit-ledger";

describe("AuditLedgerService & Hash Chaining (REQ-AUD-01)", () => {
  let mockSupabase: any;
  let inMemoryEvents: any[];

  beforeEach(() => {
    inMemoryEvents = [];

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table !== "audit_events") return {};

        return {
          select: vi.fn((_columns?: string, options?: any) => {
            const currentData = [...inMemoryEvents];

            const builder: any = {
              _data: currentData,
              _isSingle: false,
              _isLimitOne: false,
              order: vi.fn((field: string, opts?: { ascending?: boolean }) => {
                builder._data.sort((a: any, b: any) => {
                  const valA = new Date(a[field]).getTime();
                  const valB = new Date(b[field]).getTime();
                  return opts?.ascending ? valA - valB : valB - valA;
                });
                return builder;
              }),
              limit: vi.fn((n: number) => {
                if (n === 1) builder._isLimitOne = true;
                builder._data = builder._data.slice(0, n);
                return builder;
              }),
              range: vi.fn((from: number, to: number) => {
                builder._data = builder._data.slice(from, to + 1);
                return builder;
              }),
              eq: vi.fn((col: string, val: any) => {
                builder._data = builder._data.filter((item: any) => item[col] === val);
                return builder;
              }),
              single: vi.fn(async () => {
                return {
                  data: builder._data[0] || null,
                  error: builder._data[0] ? null : { message: "No row found" },
                };
              }),
              then: (resolve: any) => {
                resolve({
                  data: builder._isLimitOne ? (builder._data.length > 0 ? [builder._data[0]] : []) : builder._data,
                  count: inMemoryEvents.length,
                  error: null,
                });
              },
            };

            return builder;
          }),
          insert: vi.fn((payload: any) => {
            const newRecord = {
              id: `evt-${inMemoryEvents.length + 1}`,
              ...payload,
            };
            inMemoryEvents.push(newRecord);

            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: newRecord,
                  error: null,
                })),
              })),
            };
          }),
        };
      }),
    };
  });

  describe("Canonical JSON Serialization", () => {
    it("sorts object keys deterministically regardless of insertion order", () => {
      const obj1 = { z: 1, a: "hello", m: { b: 2, a: 1 } };
      const obj2 = { a: "hello", m: { a: 1, b: 2 }, z: 1 };

      expect(canonicalizeJson(obj1)).toBe(canonicalizeJson(obj2));
      expect(canonicalizeJson(obj1)).toBe('{"a":"hello","m":{"a":1,"b":2},"z":1}');
    });

    it("handles primitives and arrays", () => {
      expect(canonicalizeJson(null)).toBe("null");
      expect(canonicalizeJson(123)).toBe("123");
      expect(canonicalizeJson("abc")).toBe('"abc"');
      expect(canonicalizeJson([3, 1, 2])).toBe("[3,1,2]");
    });
  });

  describe("Block Hashing & Chain Creation", () => {
    it("computes deterministic SHA-256 block hash excluding _audit envelope", () => {
      const hash1 = computeBlockHash({
        sequence: 1,
        prev_hash: GENESIS_PREV_HASH,
        event_type: "task_intake",
        resource_type: "task",
        resource_id: "task-001",
        payload: { title: "Build feature", risk: "low" },
        created_at: "2026-11-17T12:00:00.000Z",
      });

      const hash2 = computeBlockHash({
        sequence: 1,
        prev_hash: GENESIS_PREV_HASH,
        event_type: "task_intake",
        resource_type: "task",
        resource_id: "task-001",
        payload: { risk: "low", title: "Build feature", _audit: { sequence: 999 } as any },
        created_at: "2026-11-17T12:00:00.000Z",
      });

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("records first event with genesis prev_hash and sequence 1", async () => {
      const service = new AuditLedgerService(mockSupabase);

      const record = await service.recordEvent({
        userId: "user-1",
        eventType: "plan_approval",
        resourceType: "plan",
        resourceId: "plan-123",
        details: { action: "approved" },
        createdAt: "2026-11-17T10:00:00.000Z",
      });

      expect(record.sequence).toBe(1);
      expect(record.prev_hash).toBe(GENESIS_PREV_HASH);
      expect(record.hash).toHaveLength(64);
      expect(record.details._audit?.sequence).toBe(1);
      expect(record.details._audit?.prev_hash).toBe(GENESIS_PREV_HASH);
      expect(inMemoryEvents).toHaveLength(1);
    });

    it("chains subsequent events by linking prev_hash to prior block hash", async () => {
      const service = new AuditLedgerService(mockSupabase);

      const block1 = await service.recordEvent({
        userId: "user-1",
        eventType: "task_intake",
        resourceType: "task",
        resourceId: "task-1",
        details: { description: "First task" },
        createdAt: "2026-11-17T10:00:00.000Z",
      });

      const block2 = await service.recordEvent({
        userId: "user-1",
        eventType: "plan_generated",
        resourceType: "plan",
        resourceId: "plan-1",
        details: { stepCount: 3 },
        createdAt: "2026-11-17T10:05:00.000Z",
      });

      const block3 = await service.recordEvent({
        userId: "user-1",
        eventType: "git_push",
        resourceType: "commit",
        resourceId: "c123456",
        details: { branch: "main" },
        createdAt: "2026-11-17T10:10:00.000Z",
      });

      expect(block1.sequence).toBe(1);
      expect(block1.prev_hash).toBe(GENESIS_PREV_HASH);

      expect(block2.sequence).toBe(2);
      expect(block2.prev_hash).toBe(block1.hash);

      expect(block3.sequence).toBe(3);
      expect(block3.prev_hash).toBe(block2.hash);
    });
  });

  describe("Chain Integrity Verification", () => {
    it("certifies a valid unmodified chain as 100% intact", async () => {
      const service = new AuditLedgerService(mockSupabase);

      await service.recordEvent({
        userId: "user-1",
        eventType: "event-a",
        resourceType: "resource-a",
        resourceId: "res-1",
        createdAt: "2026-11-17T10:00:00.000Z",
      });
      await service.recordEvent({
        userId: "user-1",
        eventType: "event-b",
        resourceType: "resource-b",
        resourceId: "res-2",
        createdAt: "2026-11-17T10:01:00.000Z",
      });
      await service.recordEvent({
        userId: "user-1",
        eventType: "event-c",
        resourceType: "resource-c",
        resourceId: "res-3",
        createdAt: "2026-11-17T10:02:00.000Z",
      });

      const result = await service.verifyChainIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.verifiedCount).toBe(3);
      expect(result.error).toBeUndefined();
      expect(result.chainHeadHash).toHaveLength(64);
    });

    it("detects tampering when an event payload is modified", async () => {
      const service = new AuditLedgerService(mockSupabase);

      await service.recordEvent({
        userId: "user-1",
        eventType: "event-a",
        resourceType: "resource-a",
        resourceId: "res-1",
        details: { authorized: true },
        createdAt: "2026-11-17T10:00:00.000Z",
      });
      await service.recordEvent({
        userId: "user-1",
        eventType: "event-b",
        resourceType: "resource-b",
        resourceId: "res-2",
        details: { amount: 100 },
        createdAt: "2026-11-17T10:01:00.000Z",
      });

      // Tamper with record 1's payload directly in the database
      inMemoryEvents[1].details.amount = 999999;

      const result = await service.verifyChainIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.verifiedCount).toBe(1);
      expect(result.corruptedEventId).toBe(inMemoryEvents[1].id);
      expect(result.error).toContain("Cryptographic digest mismatch at index 1");
    });

    it("detects tampering when an intermediate block is deleted or missing", async () => {
      const service = new AuditLedgerService(mockSupabase);

      await service.recordEvent({
        userId: "user-1",
        eventType: "evt-1",
        resourceType: "res",
        resourceId: "1",
        createdAt: "2026-11-17T10:00:00.000Z",
      });
      await service.recordEvent({
        userId: "user-1",
        eventType: "evt-2",
        resourceType: "res",
        resourceId: "2",
        createdAt: "2026-11-17T10:01:00.000Z",
      });
      await service.recordEvent({
        userId: "user-1",
        eventType: "evt-3",
        resourceType: "res",
        resourceId: "3",
        createdAt: "2026-11-17T10:02:00.000Z",
      });

      // Illegally delete intermediate record 2
      inMemoryEvents.splice(1, 1);

      const result = await service.verifyChainIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.verifiedCount).toBe(1);
      expect(result.error).toContain("Sequence gap detected at index 1");
    });

    it("detects tampering when sequence number is skipped or altered", async () => {
      const service = new AuditLedgerService(mockSupabase);

      await service.recordEvent({
        userId: "user-1",
        eventType: "evt-1",
        resourceType: "res",
        resourceId: "1",
        createdAt: "2026-11-17T10:00:00.000Z",
      });

      // Illegally tamper with sequence
      inMemoryEvents[0].details._audit.sequence = 5;

      const result = await service.verifyChainIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Sequence gap detected at index 0: expected 1, found 5");
    });

    it("returns valid status for an empty ledger", async () => {
      const service = new AuditLedgerService(mockSupabase);
      const result = await service.verifyChainIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.verifiedCount).toBe(0);
      expect(result.chainHeadHash).toBe(GENESIS_PREV_HASH);
    });
  });
});
