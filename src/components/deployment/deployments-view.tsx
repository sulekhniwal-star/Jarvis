"use client";

import * as React from "react";
import {
  Rocket,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { DeploymentRecord } from "@/lib/deployment/types";
import { DeploymentStatusCard } from "./deployment-status-card";
import { DeploymentsTable } from "./deployments-table";
import { ProductionPromotionModal } from "./production-promotion-modal";

export interface DeploymentsViewProps {
  initialDeployments: DeploymentRecord[];
  initialActiveProduction: DeploymentRecord | null;
  initialLatestPreview: DeploymentRecord | null;
  totalCount?: number;
}

export function DeploymentsView({
  initialDeployments,
  initialActiveProduction,
  initialLatestPreview,
  totalCount = 0,
}: DeploymentsViewProps) {
  const [deployments, setDeployments] = React.useState<DeploymentRecord[]>(initialDeployments);
  const [activeProduction, setActiveProduction] = React.useState<DeploymentRecord | null>(
    initialActiveProduction
  );
  const [latestPreview, setLatestPreview] = React.useState<DeploymentRecord | null>(
    initialLatestPreview
  );
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isTriggeringPreview, setIsTriggeringPreview] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTargetCommit, setSelectedTargetCommit] = React.useState<{
    sha?: string;
    message?: string;
  }>({});
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchDeployments = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/deployments");
      if (res.ok) {
        const data = await res.json();
        setDeployments(data.deployments || []);
        setActiveProduction(data.activeProduction || null);
        setLatestPreview(data.latestPreview || null);
      }
    } catch (err) {
      console.error("Failed to refresh deployments:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTriggerPreview = async () => {
    setIsTriggeringPreview(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(`Failed to trigger preview build (${res.status})`);
      }

      const data = await res.json();
      setStatusMessage({
        type: "success",
        text: `Preview deployment generated: ${data.deployment.preview_url}`,
      });
      await fetchDeployments();
    } catch (err: unknown) {
      const e = err as Error;
      setStatusMessage({
        type: "error",
        text: e.message || "Failed to trigger preview build",
      });
    } finally {
      setIsTriggeringPreview(false);
    }
  };

  const handlePromoteFromDeployment = (deployment: DeploymentRecord) => {
    setSelectedTargetCommit({
      sha: deployment.commit_sha,
      message: deployment.commit_message,
    });
    setIsModalOpen(true);
  };

  const handlePromoteClick = () => {
    if (latestPreview) {
      setSelectedTargetCommit({
        sha: latestPreview.commit_sha,
        message: latestPreview.commit_message,
      });
    } else {
      setSelectedTargetCommit({});
    }
    setIsModalOpen(true);
  };

  const handleRollback = async (deployment: DeploymentRecord) => {
    const confirmMessage = `Execute instant rollback to commit ${deployment.commit_sha.substring(
      0,
      7
    )}?\n\nTarget: "${deployment.commit_message}"`;
    if (!window.confirm(confirmMessage)) return;

    setStatusMessage(null);
    try {
      const res = await fetch(`/api/deployments/${deployment.id}/rollback`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Rollback failed with status ${res.status}`);
      }

      setStatusMessage({
        type: "success",
        text: data.rollback.message || "Production deployment successfully rolled back.",
      });
      await fetchDeployments();
    } catch (err: unknown) {
      const e = err as Error;
      setStatusMessage({
        type: "error",
        text: e.message || "Failed to execute rollback",
      });
    }
  };

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
      data-testid="deployments-view"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-3">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              Deployment & Release Gateway
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            REQ-DEP-01 (Approval Gate) • REQ-DEP-02 (Instant Rollback)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDeployments}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          data-testid="deployments-status-message"
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
            statusMessage.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-danger/10 border-danger/30 text-danger"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate">{statusMessage.text}</span>
        </div>
      )}

      {/* Active Environment Cards */}
      <DeploymentStatusCard
        activeProduction={activeProduction}
        latestPreview={latestPreview}
        onPromoteClick={handlePromoteClick}
        onTriggerPreview={handleTriggerPreview}
        onRollbackClick={
          activeProduction
            ? () => {
                const olderProd = deployments.find(
                  (d) =>
                    d.environment === "production" &&
                    d.id !== activeProduction.id &&
                    (d.status === "deployed" || d.status === "rolled_back")
                );
                if (olderProd) {
                  handleRollback(olderProd);
                } else {
                  alert("No earlier production deployment found to rollback to.");
                }
              }
            : undefined
        }
        isTriggeringPreview={isTriggeringPreview}
      />

      {/* Deployments History Table */}
      <DeploymentsTable
        deployments={deployments}
        onRollback={handleRollback}
        onPromote={handlePromoteFromDeployment}
        isLoading={isRefreshing}
      />

      {/* Production Promotion Modal */}
      <ProductionPromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setStatusMessage({
            type: "success",
            text: "Production promotion authorization request dispatched to owner.",
          });
          fetchDeployments();
        }}
        defaultCommitSha={selectedTargetCommit.sha}
        defaultCommitMessage={selectedTargetCommit.message}
      />
    </div>
  );
}
