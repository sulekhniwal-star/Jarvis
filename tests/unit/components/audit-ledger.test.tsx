import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuditChainBadge } from "@/components/audit/audit-chain-badge";
import { AuditLedgerTable } from "@/components/audit/audit-ledger-table";
import { AuditLedgerView } from "@/components/audit/audit-ledger-view";
import { AuditEventRecord, AuditChainVerificationResult } from "@/lib/audit/audit-ledger";

describe("Audit Ledger UI Components (REQ-AUD-01)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const sampleEvents: AuditEventRecord[] = [
    {
      id: "evt-01",
      user_id: "usr-1",
      event_type: "task_intake",
      resource_type: "task",
      resource_id: "task-abc-123",
      details: { title: "Implement feature X", _audit: { sequence: 1, prev_hash: "0".repeat(64), hash: "hash11111111" } },
      ip_address: null,
      user_agent: null,
      created_at: "2026-11-17T10:00:00.000Z",
      sequence: 1,
      prev_hash: "0".repeat(64),
      hash: "hash1111111122222222333333334444444455555555666666667777777788888888",
    },
    {
      id: "evt-02",
      user_id: "usr-1",
      event_type: "approval_granted",
      resource_type: "approval",
      resource_id: "app-xyz-456",
      details: { decision: "approved", _audit: { sequence: 2, prev_hash: "hash11111111", hash: "hash22222222" } },
      ip_address: null,
      user_agent: null,
      created_at: "2026-11-17T10:05:00.000Z",
      sequence: 2,
      prev_hash: "hash1111111122222222333333334444444455555555666666667777777788888888",
      hash: "hash2222222233333333444444445555555566666666777777778888888899999999",
    },
  ];

  describe("AuditChainBadge", () => {
    it("renders verified status correctly", () => {
      const status: AuditChainVerificationResult = {
        isValid: true,
        verifiedCount: 42,
        chainHeadHash: "abcdef1234567890",
        timestamp: "2026-11-17T12:00:00.000Z",
      };

      render(<AuditChainBadge status={status} />);
      expect(screen.getByText("Chain Integrity Verified")).toBeDefined();
      expect(screen.getByText(/42 blocks valid/i)).toBeDefined();
    });

    it("renders compromised status with error explanation", () => {
      const status: AuditChainVerificationResult = {
        isValid: false,
        verifiedCount: 15,
        chainHeadHash: "abcdef1234567890",
        error: "Cryptographic digest mismatch at index 15",
        timestamp: "2026-11-17T12:00:00.000Z",
      };

      render(<AuditChainBadge status={status} />);
      expect(screen.getByText("Chain Compromised / Corrupted")).toBeDefined();
      expect(screen.getByText("Cryptographic digest mismatch at index 15")).toBeDefined();
    });

    it("renders verifying spinner state", () => {
      render(<AuditChainBadge status={null} isVerifying={true} />);
      expect(screen.getByText("Verifying Cryptographic Chain...")).toBeDefined();
    });

    it("invokes onVerify callback when clicking re-verify button", () => {
      const onVerify = vi.fn();
      const status: AuditChainVerificationResult = {
        isValid: true,
        verifiedCount: 5,
        chainHeadHash: "12345678",
        timestamp: "2026-11-17T12:00:00.000Z",
      };

      render(<AuditChainBadge status={status} onVerify={onVerify} />);
      const btn = screen.getByTestId("reverify-chain-button");
      fireEvent.click(btn);
      expect(onVerify).toHaveBeenCalledTimes(1);
    });
  });

  describe("AuditLedgerTable", () => {
    it("renders table with records and sequence numbers", () => {
      render(<AuditLedgerTable events={sampleEvents} />);
      expect(screen.getByText("#1")).toBeDefined();
      expect(screen.getByText("#2")).toBeDefined();
      expect(screen.getAllByText("task_intake").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("approval_granted").length).toBeGreaterThanOrEqual(1);
    });

    it("filters records by search text", () => {
      render(<AuditLedgerTable events={sampleEvents} />);
      const searchInput = screen.getByTestId("audit-search-input");

      fireEvent.change(searchInput, { target: { value: "app-xyz" } });
      expect(screen.queryByTestId("audit-row-evt-01")).toBeNull();
      expect(screen.getByTestId("audit-row-evt-02")).toBeDefined();
    });

    it("filters records by event type dropdown", () => {
      render(<AuditLedgerTable events={sampleEvents} />);
      const select = screen.getByTestId("audit-type-select");

      fireEvent.change(select, { target: { value: "task_intake" } });
      expect(screen.getByTestId("audit-row-evt-01")).toBeDefined();
      expect(screen.queryByTestId("audit-row-evt-02")).toBeNull();
    });

    it("expands details row on click", () => {
      render(<AuditLedgerTable events={sampleEvents} />);
      const row = screen.getByTestId("audit-row-evt-01");
      fireEvent.click(row);

      expect(screen.getByText("Full Block Hash:")).toBeDefined();
      expect(screen.getByText("Canonical Payload Details:")).toBeDefined();
      expect(screen.getByText(/Implement feature X/i)).toBeDefined();
    });
  });

  describe("AuditLedgerView", () => {
    it("renders master view with metrics cards and initial state", () => {
      const initialVerification: AuditChainVerificationResult = {
        isValid: true,
        verifiedCount: 2,
        chainHeadHash: sampleEvents[1].hash,
        timestamp: "2026-11-17T10:10:00.000Z",
      };

      render(
        <AuditLedgerView
          initialEvents={sampleEvents}
          initialVerification={initialVerification}
          totalCount={2}
        />
      );

      expect(screen.getByText("Tamper-Evident Audit Ledger")).toBeDefined();
      expect(screen.getByText("Total Audit Events")).toBeDefined();
      expect(screen.getByText("100% Intact")).toBeDefined();
    });

    it("triggers re-verification via API call", async () => {
      const updatedResult: AuditChainVerificationResult = {
        isValid: true,
        verifiedCount: 3,
        chainHeadHash: "newheadhash123",
        timestamp: "2026-11-17T11:00:00.000Z",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => updatedResult,
      } as Response);

      render(
        <AuditLedgerView
          initialEvents={sampleEvents}
          initialVerification={null}
          totalCount={2}
        />
      );

      const verifyBtn = screen.getByRole("button", { name: /Verify Chain/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/audit/verify");
        expect(screen.getByText("Chain Integrity Verified")).toBeDefined();
        expect(screen.getByText(/3 blocks valid/i)).toBeDefined();
      });
    });
  });
});
