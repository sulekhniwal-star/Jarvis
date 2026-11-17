import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCosts, POST as postCost } from "@/app/api/costs/route";
import { GET as getSummary } from "@/app/api/costs/summary/route";
import { POST as postEmergencyReserve } from "@/app/api/costs/emergency-reserve/route";

const mockUser = { id: "user-123", email: "test@javis.local" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("Cost API Routes", () => {
  let mockSupabase: any;
  let mockCostRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe("GET /api/costs", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      const request = new NextRequest("http://localhost:3000/api/costs");
      const response = await getCosts(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("UNAUTHORIZED");
    });

    it("returns paginated cost records for authenticated user", async () => {
      // Mock CostRepository.prototype methods
      const listSpy = vi
        .spyOn(
          (await import("@/lib/repositories/cost-repository")).CostRepository
            .prototype,
          "listCostRecords"
        )
        .mockResolvedValueOnce({
          data: [
            {
              id: "cr-1",
              user_id: "user-123",
              provider: "openrouter",
              model: "anthropic/claude-3.5-sonnet",
              prompt_tokens: 1000,
              completion_tokens: 500,
              total_tokens: 1500,
              cost_inr: 0.756,
              is_estimated: false,
              created_at: "2026-11-17T12:00:00Z",
              run_id: null,
            },
          ],
          total: 1,
          limit: 50,
          offset: 0,
        });

      const request = new NextRequest(
        "http://localhost:3000/api/costs?limit=50&offset=0"
      );
      const response = await getCosts(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.total).toBe(1);
      expect(json.data[0].model).toBe("anthropic/claude-3.5-sonnet");
      expect(listSpy).toHaveBeenCalledWith("user-123", expect.any(Object));
    });
  });

  describe("POST /api/costs", () => {
    it("returns 400 when required payload fields are missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/costs", {
        method: "POST",
        body: JSON.stringify({ model: "openai/gpt-4o" }), // missing provider, promptTokens, completionTokens
      });

      const response = await postCost(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("VALIDATION_FAILED");
    });

    it("creates a cost record and returns 201", async () => {
      const recordSpy = vi
        .spyOn(
          (await import("@/lib/repositories/cost-repository")).CostRepository
            .prototype,
          "recordUsage"
        )
        .mockResolvedValueOnce({
          id: "cr-new",
          user_id: "user-123",
          provider: "openrouter",
          model: "openai/gpt-4o",
          prompt_tokens: 500,
          completion_tokens: 200,
          total_tokens: 700,
          cost_inr: 0.42,
          is_estimated: false,
          created_at: "2026-11-17T12:30:00Z",
          run_id: null,
        });

      const request = new NextRequest("http://localhost:3000/api/costs", {
        method: "POST",
        body: JSON.stringify({
          provider: "openrouter",
          model: "openai/gpt-4o",
          promptTokens: 500,
          completionTokens: 200,
          costInr: 0.42,
        }),
      });

      const response = await postCost(request);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.record.id).toBe("cr-new");
      expect(recordSpy).toHaveBeenCalledWith("user-123", expect.any(Object));
    });
  });

  describe("GET /api/costs/summary", () => {
    it("returns financial overview and circuit breaker status", async () => {
      vi.spyOn(
        (await import("@/lib/repositories/cost-repository")).CostRepository
          .prototype,
        "getSpendSummary"
      ).mockResolvedValueOnce({
        todaySpendInr: 12.5,
        monthSpendInr: 320.0,
        dailyLimitInr: 25.0,
        monthlyLimitInr: 750.0,
        emergencyReserveInr: 250.0,
        absoluteCeilingInr: 1000.0,
        isEmergencyReserveActive: false,
        circuitBreakerStatus: "nominal",
        recentRecords: [],
        spendByModel: {},
      });

      const request = new NextRequest("http://localhost:3000/api/costs/summary");
      const response = await getSummary(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.todaySpendInr).toBe(12.5);
      expect(json.circuitBreakerStatus).toBe("nominal");
    });
  });

  describe("POST /api/costs/emergency-reserve", () => {
    it("unlocks emergency reserve and returns updated summary", async () => {
      const unlockSpy = vi
        .spyOn(
          (await import("@/lib/repositories/cost-repository")).CostRepository
            .prototype,
          "unlockEmergencyReserve"
        )
        .mockResolvedValueOnce(undefined);

      vi.spyOn(
        (await import("@/lib/repositories/cost-repository")).CostRepository
          .prototype,
        "getSpendSummary"
      ).mockResolvedValueOnce({
        todaySpendInr: 12.5,
        monthSpendInr: 760.0,
        dailyLimitInr: 25.0,
        monthlyLimitInr: 750.0,
        emergencyReserveInr: 250.0,
        absoluteCeilingInr: 1000.0,
        isEmergencyReserveActive: true,
        circuitBreakerStatus: "emergency_unlocked",
        recentRecords: [],
        spendByModel: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/costs/emergency-reserve",
        {
          method: "POST",
          body: JSON.stringify({ reason: "Hotfix deployment surge" }),
        }
      );

      const response = await postEmergencyReserve(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.summary.circuitBreakerStatus).toBe("emergency_unlocked");
      expect(unlockSpy).toHaveBeenCalledWith(
        "user-123",
        "Hotfix deployment surge"
      );
    });
  });
});
