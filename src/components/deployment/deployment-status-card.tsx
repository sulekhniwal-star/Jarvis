"use client";

import * as React from "react";
import {
  Rocket,
  Globe,
  GitBranch,
  GitCommit,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { DeploymentRecord } from "@/lib/deployment/types";
import { Badge } from "@/components/ui/badge";

export interface DeploymentStatusCardProps {
  activeProduction: DeploymentRecord | null;
  latestPreview: DeploymentRecord | null;
  onPromoteClick: () => void;
  onTriggerPreview: () => void;
  onRollbackClick?: () => void;
  isTriggeringPreview?: boolean;
}

export function DeploymentStatusCard({
  activeProduction,
  latestPreview,
  onPromoteClick,
  onTriggerPreview,
  onRollbackClick,
  isTriggeringPreview = false,
}: DeploymentStatusCardProps) {
  const prodCommitShort = activeProduction
    ? activeProduction.commit_sha.substring(0, 7)
    : "—";

  const prevCommitShort = latestPreview
    ? latestPreview.commit_sha.substring(0, 7)
    : "—";

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      data-testid="deployment-status-card"
    >
      {/* Live Production Environment Card */}
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/30 flex items-center justify-center text-success">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Production Environment
              </h2>
              <p className="text-xs text-text-secondary">
                REQ-DEP-01 • Gated by Human Approval
              </p>
            </div>
          </div>
          <Badge variant={activeProduction ? "success" : "outline"} pulse={!!activeProduction}>
            {activeProduction ? "Live Production" : "Not Deployed"}
          </Badge>
        </div>

        {activeProduction ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2/60 border border-surface-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-mono text-text-secondary">URL:</span>
                <a
                  href={activeProduction.production_url || "https://jarvis.app"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-medium text-accent-cyan hover:underline flex items-center gap-1 truncate"
                >
                  {activeProduction.production_url || "https://jarvis.app"}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <span className="text-[11px] text-text-secondary font-mono">
                {activeProduction.deployed_at
                  ? new Date(activeProduction.deployed_at).toLocaleString()
                  : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-2/40 border border-surface-3">
                <span className="text-text-secondary text-[10px] uppercase font-mono block">
                  Commit SHA
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <GitCommit className="w-3.5 h-3.5 text-accent-ice" />
                  <span className="font-mono font-medium text-text-primary">
                    {prodCommitShort}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-2/40 border border-surface-3">
                <span className="text-text-secondary text-[10px] uppercase font-mono block">
                  Branch
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <GitBranch className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="font-mono font-medium text-text-primary">
                    {activeProduction.branch}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary line-clamp-1 italic">
              "{activeProduction.commit_message || "No commit message"}"
            </p>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-text-secondary">
            No active production deployment found. Initiate a promotion request below.
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-surface-3">
          <button
            type="button"
            onClick={onPromoteClick}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-accent-cyan text-surface-base hover:bg-accent-cyan/90 transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            Promote to Production
          </button>
          {onRollbackClick && activeProduction && (
            <button
              type="button"
              onClick={onRollbackClick}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-danger/30 text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
              title="Rollback to a previously verified release"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rollback
            </button>
          )}
        </div>
      </div>

      {/* Preview Environment Card */}
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Preview Environment
              </h2>
              <p className="text-xs text-text-secondary">
                Continuous Integration • Ephemeral URLs
              </p>
            </div>
          </div>
          <Badge variant={latestPreview ? "cyan" : "outline"}>
            {latestPreview ? "Active Preview" : "No Previews"}
          </Badge>
        </div>

        {latestPreview ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2/60 border border-surface-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-mono text-text-secondary">URL:</span>
                <a
                  href={latestPreview.preview_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-medium text-accent-cyan hover:underline flex items-center gap-1 truncate"
                >
                  {latestPreview.preview_url || "Preview URL unavailable"}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <span className="text-[11px] text-text-secondary font-mono">
                {latestPreview.created_at
                  ? new Date(latestPreview.created_at).toLocaleTimeString()
                  : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-2/40 border border-surface-3">
                <span className="text-text-secondary text-[10px] uppercase font-mono block">
                  Commit SHA
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <GitCommit className="w-3.5 h-3.5 text-accent-ice" />
                  <span className="font-mono font-medium text-text-primary">
                    {prevCommitShort}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-2/40 border border-surface-3">
                <span className="text-text-secondary text-[10px] uppercase font-mono block">
                  Status
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="font-mono font-medium text-success uppercase text-[11px]">
                    {latestPreview.status}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary line-clamp-1 italic">
              "{latestPreview.commit_message || "Automated preview build"}"
            </p>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-text-secondary">
            No preview builds recorded yet. Trigger a preview build to preview latest changes.
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-surface-3">
          <button
            type="button"
            onClick={onTriggerPreview}
            disabled={isTriggeringPreview}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-accent-cyan/30 text-accent-cyan bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5" />
            {isTriggeringPreview ? "Building Preview..." : "Trigger Preview Build"}
          </button>
        </div>
      </div>
    </div>
  );
}
