import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeploymentStatusCard } from "@/components/deployment/deployment-status-card";
import { DeploymentsTable } from "@/components/deployment/deployments-table";
import { ProductionPromotionModal } from "@/components/deployment/production-promotion-modal";
import { DeploymentsView } from "@/components/deployment/deployments-view";
import { DeploymentRecord } from "@/lib/deployment/types";

describe("Deployment Portal UI Components (REQ-DEP-01, REQ-DEP-02)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const sampleProdDeployment: DeploymentRecord = {
    id: "dep-prod-01",
    environment: "production",
    commit_sha: "a1b2c3d4e5f60000000000000000000000000000",
    commit_message: "feat: production v9.0 release",
    branch: "main",
    status: "deployed",
    preview_url: null,
    production_url: "https://jarvis.app",
    approval_id: "appr-01",
    created_by: "usr-1",
    rollback_target_id: null,
    verification_passed: true,
    verification_summary: "107 test files passed",
    deployed_at: "2026-11-17T12:00:00.000Z",
    created_at: "2026-11-17T11:55:00.000Z",
    updated_at: "2026-11-17T12:00:00.000Z",
  };

  const samplePreviewDeployment: DeploymentRecord = {
    id: "dep-prev-01",
    environment: "preview",
    commit_sha: "f1e2d3c4b5a60000000000000000000000000000",
    commit_message: "test: experimental feature preview",
    branch: "main",
    status: "deployed",
    preview_url: "https://jarvis-preview-f1e2d3c.vercel.app",
    production_url: null,
    approval_id: null,
    created_by: "usr-1",
    rollback_target_id: null,
    verification_passed: true,
    verification_summary: null,
    deployed_at: "2026-11-17T12:10:00.000Z",
    created_at: "2026-11-17T12:08:00.000Z",
    updated_at: "2026-11-17T12:10:00.000Z",
  };

  describe("DeploymentStatusCard", () => {
    it("renders active production deployment and preview links", () => {
      const onPromote = vi.fn();
      const onTrigger = vi.fn();
      const onRollback = vi.fn();

      render(
        <DeploymentStatusCard
          activeProduction={sampleProdDeployment}
          latestPreview={samplePreviewDeployment}
          onPromoteClick={onPromote}
          onTriggerPreview={onTrigger}
          onRollbackClick={onRollback}
        />
      );

      expect(screen.getByText("Live Production")).toBeDefined();
      expect(screen.getByText("a1b2c3d")).toBeDefined();
      expect(screen.getByText("https://jarvis.app")).toBeDefined();

      expect(screen.getByText("Active Preview")).toBeDefined();
      expect(screen.getByText("f1e2d3c")).toBeDefined();
      expect(screen.getByText("https://jarvis-preview-f1e2d3c.vercel.app")).toBeDefined();

      fireEvent.click(screen.getByText("Promote to Production"));
      expect(onPromote).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText("Trigger Preview Build"));
      expect(onTrigger).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText("Rollback"));
      expect(onRollback).toHaveBeenCalledTimes(1);
    });

    it("renders empty state placeholder when no active deployments exist", () => {
      render(
        <DeploymentStatusCard
          activeProduction={null}
          latestPreview={null}
          onPromoteClick={vi.fn()}
          onTriggerPreview={vi.fn()}
        />
      );

      expect(screen.getByText("Not Deployed")).toBeDefined();
      expect(screen.getByText("No Previews")).toBeDefined();
      expect(screen.getByText(/No active production deployment found/i)).toBeDefined();
    });
  });

  describe("DeploymentsTable", () => {
    it("renders table with records and filters by environment", () => {
      const onRollback = vi.fn();
      const onPromote = vi.fn();

      render(
        <DeploymentsTable
          deployments={[sampleProdDeployment, samplePreviewDeployment]}
          onRollback={onRollback}
          onPromote={onPromote}
        />
      );

      expect(screen.getByTestId("deployment-row-dep-prod-01")).toBeDefined();
      expect(screen.getByTestId("deployment-row-dep-prev-01")).toBeDefined();

      const envSelect = screen.getByLabelText("Filter by Environment");
      fireEvent.change(envSelect, { target: { value: "production" } });

      expect(screen.getByTestId("deployment-row-dep-prod-01")).toBeDefined();
      expect(screen.queryByTestId("deployment-row-dep-prev-01")).toBeNull();

      fireEvent.change(envSelect, { target: { value: "preview" } });
      expect(screen.queryByTestId("deployment-row-dep-prod-01")).toBeNull();
      expect(screen.getByTestId("deployment-row-dep-prev-01")).toBeDefined();
    });

    it("triggers rollback and promote callbacks from table actions", () => {
      const onRollback = vi.fn();
      const onPromote = vi.fn();

      render(
        <DeploymentsTable
          deployments={[sampleProdDeployment, samplePreviewDeployment]}
          onRollback={onRollback}
          onPromote={onPromote}
        />
      );

      const rollbackBtn = screen.getByText("Rollback to this");
      fireEvent.click(rollbackBtn);
      expect(onRollback).toHaveBeenCalledWith(sampleProdDeployment);

      const promoteBtn = screen.getByText("Promote");
      fireEvent.click(promoteBtn);
      expect(onPromote).toHaveBeenCalledWith(samplePreviewDeployment);
    });
  });

  describe("ProductionPromotionModal", () => {
    it("does not render when closed", () => {
      render(
        <ProductionPromotionModal
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("submits promotion request payload and displays success message", async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          deployment: { id: "dep-new-prod" },
          approval: { id: "appr-new-123" },
        }),
      });

      render(
        <ProductionPromotionModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
          defaultCommitSha="testsha12345"
          defaultCommitMessage="release test"
        />
      );

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByDisplayValue("testsha12345")).toBeDefined();

      const submitBtn = screen.getByText("Request Production Approval");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Promotion Request Dispatched!")).toBeDefined();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/deployments/production/request",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("testsha12345"),
        })
      );
    });
  });

  describe("DeploymentsView", () => {
    it("renders orchestrator view with status card and table", () => {
      render(
        <DeploymentsView
          initialDeployments={[sampleProdDeployment]}
          initialActiveProduction={sampleProdDeployment}
          initialLatestPreview={null}
          totalCount={1}
        />
      );

      expect(screen.getByTestId("deployments-view")).toBeDefined();
      expect(screen.getByTestId("deployment-status-card")).toBeDefined();
      expect(screen.getByTestId("deployments-table-card")).toBeDefined();
      expect(screen.getByText("Deployment & Release Gateway")).toBeDefined();
    });
  });
});
