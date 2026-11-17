"use client";

import * as React from "react";
import {
  GitCommit,
  GitBranch,
  ExternalLink,
  RotateCcw,
  Rocket,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { DeploymentRecord, DeploymentEnvironment, DeploymentStatus } from "@/lib/deployment/types";
import { Badge } from "@/components/ui/badge";

export interface DeploymentsTableProps {
  deployments: DeploymentRecord[];
  onRollback: (deployment: DeploymentRecord) => void;
  onPromote: (deployment: DeploymentRecord) => void;
  isLoading?: boolean;
}

export function DeploymentsTable({
  deployments,
  onRollback,
  onPromote,
  isLoading = false,
}: DeploymentsTableProps) {
  const [envFilter, setEnvFilter] = React.useState<"all" | DeploymentEnvironment>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | DeploymentStatus>("all");

  const filteredDeployments = React.useMemo(() => {
    return deployments.filter((d) => {
      if (envFilter !== "all" && d.environment !== envFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [deployments, envFilter, statusFilter]);

  const getStatusBadge = (status: DeploymentStatus) => {
    switch (status) {
      case "deployed":
        return <Badge variant="success">Deployed</Badge>;
      case "pending_approval":
        return <Badge variant="warning">Pending Approval</Badge>;
      case "rolled_back":
        return <Badge variant="danger">Rolled Back</Badge>;
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      case "building":
        return <Badge variant="ice">Building</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div
      className="rounded-xl border border-surface-3 bg-surface-1 overflow-hidden shadow-sm space-y-4"
      data-testid="deployments-table-card"
    >
      {/* Table Header & Filters */}
      <div className="p-4 border-b border-surface-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Deployment History & Audit Trail
          </h3>
          <p className="text-xs text-text-secondary">
            Continuous multi-environment release log with rollback controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Environment Filter */}
          <div className="relative">
            <select
              aria-label="Filter by Environment"
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-surface-3 bg-surface-2 text-text-primary focus:outline-none focus:border-accent-cyan cursor-pointer"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="preview">Preview</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              aria-label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-surface-3 bg-surface-2 text-text-primary focus:outline-none focus:border-accent-cyan cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="deployed">Deployed</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="rolled_back">Rolled Back</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-2/60 border-b border-surface-3 text-text-secondary uppercase tracking-wider font-mono">
            <tr>
              <th className="py-2.5 px-4">Environment</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Commit & Branch</th>
              <th className="py-2.5 px-4">URL</th>
              <th className="py-2.5 px-4">Deployed At</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-3 text-text-primary">
            {filteredDeployments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-secondary">
                  {isLoading ? "Loading deployments..." : "No deployments matching current filters."}
                </td>
              </tr>
            ) : (
              filteredDeployments.map((d) => {
                const shortSha = d.commit_sha.substring(0, 7);
                const activeUrl = d.environment === "production" ? d.production_url : d.preview_url;

                return (
                  <tr
                    key={d.id}
                    data-testid={`deployment-row-${d.id}`}
                    className="hover:bg-surface-2/40 transition-colors"
                  >
                    {/* Environment */}
                    <td className="py-3 px-4">
                      <Badge variant={d.environment === "production" ? "ice" : "cyan"}>
                        {d.environment}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(d.status)}</td>

                    {/* Commit & Message */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
                        <GitCommit className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                        <span className="text-text-primary font-medium">{shortSha}</span>
                        <span>•</span>
                        <GitBranch className="w-3 h-3 flex-shrink-0" />
                        <span>{d.branch}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate mt-0.5" title={d.commit_message}>
                        {d.commit_message || "—"}
                      </p>
                    </td>

                    {/* URL */}
                    <td className="py-3 px-4 font-mono">
                      {activeUrl ? (
                        <a
                          href={activeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent-cyan hover:underline truncate max-w-[180px]"
                        >
                          <span className="truncate">{activeUrl.replace("https://", "")}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-text-secondary/50">—</span>
                      )}
                    </td>

                    {/* Deployed At */}
                    <td className="py-3 px-4 text-text-secondary font-mono text-[11px]">
                      {d.deployed_at ? new Date(d.deployed_at).toLocaleString() : new Date(d.created_at).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {d.environment === "preview" && d.status === "deployed" && (
                        <button
                          type="button"
                          onClick={() => onPromote(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-accent-cyan/30 text-accent-cyan bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors"
                        >
                          <Rocket className="w-3 h-3" />
                          Promote
                        </button>
                      )}

                      {d.environment === "production" && (
                        <button
                          type="button"
                          onClick={() => onRollback(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-surface-3 text-text-secondary hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-colors"
                          title="Rollback production pointer to this deployment"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Rollback to this
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
