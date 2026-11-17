import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CostMetricsBanner } from "@/components/cost/cost-metrics-banner";
import { CircuitBreakerCard } from "@/components/cost/circuit-breaker-card";
import { EmergencyReserveModal } from "@/components/cost/emergency-reserve-modal";
import { CostLedgerTable } from "@/components/cost/cost-ledger-table";
import { CostManagementView } from "@/components/cost/cost-management-view";
import { CostRecord } from "@/types/database";

const mockCostRecords: CostRecord[] = [
  {
    id: "rec-1",
    user_id: "user-1",
    run_id: "run-101",
    provider: "openrouter",
    model: "anthropic/claude-3.5-sonnet",
    prompt_tokens: 1500,
    completion_tokens: 800,
    total_tokens: 2300,
    cost_inr: 1.159,
    is_estimated: false,
    created_at: "2026-11-17T12:00:00Z",
  },
  {
    id: "rec-2",
    user_id: "user-1",
    run_id: null,
    provider: "openrouter",
    model: "openai/gpt-4o",
    prompt_tokens: 800,
    completion_tokens: 400,
    total_tokens: 1200,
    cost_inr: 0.72,
    is_estimated: true,
    created_at: "2026-11-17T12:30:00Z",
  },
];

describe("CostMetricsBanner Component", () => {
  it("renders daily, monthly, emergency reserve, and hard ceiling figures", () => {
    render(
      <CostMetricsBanner
        todaySpendInr={12.5}
        monthSpendInr={350.0}
        dailyLimitInr={25.0}
        monthlyLimitInr={750.0}
        emergencyReserveInr={250.0}
        absoluteCeilingInr={1000.0}
        isEmergencyReserveActive={false}
      />
    );

    expect(screen.getByText("Today's Spend")).toBeDefined();
    expect(screen.getByText("₹12.50")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined(); // 12.5 / 25.0

    expect(screen.getByText("Monthly Spend")).toBeDefined();
    expect(screen.getByText("₹350.00")).toBeDefined();

    expect(screen.getByText("Emergency Reserve")).toBeDefined();
    expect(screen.getByText("Locked")).toBeDefined();

    expect(screen.getByText("Hard Ceiling")).toBeDefined();
    expect(screen.getByText("₹1000.00")).toBeDefined();
  });

  it("indicates active status when emergency reserve is authorized", () => {
    render(
      <CostMetricsBanner
        todaySpendInr={5.0}
        monthSpendInr={800.0}
        isEmergencyReserveActive={true}
      />
    );

    expect(screen.getByText("Active")).toBeDefined();
  });
});

describe("CircuitBreakerCard Component", () => {
  it("renders nominal state correctly", () => {
    render(
      <CircuitBreakerCard
        status="nominal"
        todaySpendInr={5.0}
        monthSpendInr={100.0}
        isEmergencyReserveActive={false}
      />
    );

    expect(screen.getByText("Circuit Breaker: Nominal")).toBeDefined();
    expect(screen.getByText("Nominal")).toBeDefined();
  });

  it("renders tripped daily state with alert", () => {
    render(
      <CircuitBreakerCard
        status="tripped_daily"
        todaySpendInr={25.5}
        monthSpendInr={100.0}
        isEmergencyReserveActive={false}
      />
    );

    expect(
      screen.getByText("Circuit Breaker: Tripped (Daily Cap)")
    ).toBeDefined();
    expect(screen.getByText("Tripped (Daily)")).toBeDefined();
  });

  it("renders tripped monthly state and unlock reserve button", () => {
    const handleOpen = vi.fn();
    render(
      <CircuitBreakerCard
        status="tripped_monthly"
        todaySpendInr={5.0}
        monthSpendInr={755.0}
        isEmergencyReserveActive={false}
        onOpenReserveModal={handleOpen}
      />
    );

    expect(
      screen.getByText("Circuit Breaker: Tripped (Monthly Budget)")
    ).toBeDefined();

    const unlockBtn = screen.getByTestId("unlock-reserve-button");
    expect(unlockBtn).toBeDefined();
    fireEvent.click(unlockBtn);
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it("renders emergency active state with purple indicator", () => {
    render(
      <CircuitBreakerCard
        status="emergency_unlocked"
        todaySpendInr={5.0}
        monthSpendInr={820.0}
        isEmergencyReserveActive={true}
      />
    );

    expect(
      screen.getByText("Circuit Breaker: Emergency Reserve Active")
    ).toBeDefined();
    expect(screen.getByText("Emergency Active")).toBeDefined();
    expect(screen.queryByTestId("unlock-reserve-button")).toBeNull();
  });
});

describe("EmergencyReserveModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders modal dialog and authorizes emergency reserve via POST", async () => {
    const handleUnlocked = vi.fn();
    const handleClose = vi.fn();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EmergencyReserveModal
        isOpen={true}
        onClose={handleClose}
        onUnlocked={handleUnlocked}
      />
    );

    expect(screen.getByText("Unlock Emergency Reserve")).toBeDefined();
    expect(screen.getByText("Financial Guardrails Terms")).toBeDefined();

    const textarea = screen.getByPlaceholderText(
      "e.g., Critical production incident troubleshooting and bugfix deployment."
    );
    fireEvent.change(textarea, { target: { value: "Critical incident surge" } });

    const confirmBtn = screen.getByTestId("confirm-reserve-button");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/costs/emergency-reserve",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Critical incident surge" }),
        })
      );
      expect(handleUnlocked).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe("CostLedgerTable Component", () => {
  it("renders table rows with models, token counts, and cost in INR", () => {
    render(<CostLedgerTable records={mockCostRecords} />);

    expect(screen.getAllByText("anthropic/claude-3.5-sonnet").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("openai/gpt-4o").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₹1.1590")).toBeDefined();
    expect(screen.getByText("₹0.7200")).toBeDefined();
    expect(screen.getByText("Exact")).toBeDefined();
    expect(screen.getByText("Est.")).toBeDefined();
  });

  it("filters records by model dropdown selection", () => {
    render(<CostLedgerTable records={mockCostRecords} />);

    const select = screen.getByTestId("cost-model-filter");
    fireEvent.change(select, { target: { value: "openai/gpt-4o" } });

    expect(screen.getByRole("cell", { name: /openai\/gpt-4o/i })).toBeDefined();
    expect(screen.queryByRole("cell", { name: /anthropic\/claude-3\.5-sonnet/i })).toBeNull();
  });

  it("filters records by text search input", () => {
    render(<CostLedgerTable records={mockCostRecords} />);

    const searchInput = screen.getByTestId("cost-search-input");
    fireEvent.change(searchInput, { target: { value: "claude" } });

    expect(screen.getByRole("cell", { name: /anthropic\/claude-3\.5-sonnet/i })).toBeDefined();
    expect(screen.queryByRole("cell", { name: /openai\/gpt-4o/i })).toBeNull();
  });

  it("renders empty state when search finds no matches", () => {
    render(<CostLedgerTable records={mockCostRecords} />);

    const searchInput = screen.getByTestId("cost-search-input");
    fireEvent.change(searchInput, { target: { value: "nonexistent-model" } });

    expect(screen.getByText("No cost records found")).toBeDefined();
  });
});

describe("CostManagementView Component", () => {
  it("renders the master cost view with all summary sections", () => {
    render(
      <CostManagementView
        initialSummary={{
          todaySpendInr: 10.0,
          monthSpendInr: 250.0,
          dailyLimitInr: 25.0,
          monthlyLimitInr: 750.0,
          emergencyReserveInr: 250.0,
          absoluteCeilingInr: 1000.0,
          isEmergencyReserveActive: false,
          circuitBreakerStatus: "nominal",
          recentRecords: mockCostRecords,
          spendByModel: {
            "anthropic/claude-3.5-sonnet": {
              totalInr: 150.0,
              totalTokens: 25000,
              callCount: 15,
            },
          },
        }}
      />
    );

    expect(screen.getByTestId("cost-metrics-banner")).toBeDefined();
    expect(screen.getByTestId("circuit-breaker-card")).toBeDefined();
    expect(screen.getByTestId("cost-ledger-table")).toBeDefined();
    expect(screen.getByText("Monthly Model Distribution")).toBeDefined();
  });
});
