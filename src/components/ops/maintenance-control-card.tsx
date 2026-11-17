"use client";

import * as React from "react";
import {
  Trash2,
  ShieldCheck,
  RefreshCw,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface MaintenanceStatusSummary {
  lastRun?: string;
  bytesReclaimed?: number;
  artifactsPruned?: number;
  approvalsExpired?: number;
  tempFilesCleaned?: number;
  isDryRun?: boolean;
}

export interface MaintenanceControlCardProps {
  initialReport?: MaintenanceStatusSummary | null;
}

export function MaintenanceControlCard({ initialReport = null }: MaintenanceControlCardProps) {
  const [report, setReport] = React.useState<MaintenanceStatusSummary | null>(initialReport);
  const [isPruning, setIsPruning] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
    }
  }, [initialReport]);

  const handleRunPruning = async (dryRun: boolean = false) => {
    setIsPruning(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/maintenance/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: 30, dryRun }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Pruning request failed with status ${res.status}`);
      }

      const result = await res.json();
      setReport({
        lastRun: result.timestamp || new Date().toISOString(),
        bytesReclaimed: result.bytesReclaimed ?? 0,
        artifactsPruned: result.artifactsPruned ?? 0,
        approvalsExpired: result.approvalsExpired ?? 0,
        tempFilesCleaned: result.tempFilesCleaned ?? 0,
        isDryRun: result.isDryRun ?? dryRun,
      });

      const modeText = dryRun ? "Dry-run simulation" : "Live maintenance";
      const sizeMb = ((result.bytesReclaimed ?? 0) / (1024 * 1024)).toFixed(2);
      setStatusMessage(
        `${modeText} complete: ${result.artifactsPruned ?? 0} artifacts pruned (${sizeMb} MB reclaimed), ${result.approvalsExpired ?? 0} stale approvals expired.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsPruning(false);
    }
  };

  const formattedBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "0.00 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Card className="border border-surface-3 bg-surface-1 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-brand-primary">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-text-primary">
                Automated Storage Pruning & Branch Hygiene
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                REQ-OPS-03 retention rotation & NFR-SEC-04 continuous branch safety
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="gap-1.5 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Branch Hygiene: Main-Only Locked
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Status Alerts */}
        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-surface-2 bg-surface-2/40 p-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Clock className="h-3.5 w-3.5 text-text-secondary" />
              <span>Retention Policy</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              30 Days
            </div>
            <div className="text-[10px] text-text-secondary">Ephemeral artifacts</div>
          </div>

          <div className="rounded-lg border border-surface-2 bg-surface-2/40 p-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <HardDrive className="h-3.5 w-3.5 text-text-secondary" />
              <span>Space Reclaimed</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              {formattedBytes(report?.bytesReclaimed)}
            </div>
            <div className="text-[10px] text-text-secondary">
              {report?.artifactsPruned ?? 0} artifacts pruned
            </div>
          </div>

          <div className="rounded-lg border border-surface-2 bg-surface-2/40 p-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <RefreshCw className="h-3.5 w-3.5 text-text-secondary" />
              <span>Stale Approvals</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              {report?.approvalsExpired ?? 0} Expired
            </div>
            <div className="text-[10px] text-text-secondary">Hash-chained audit</div>
          </div>

          <div className="rounded-lg border border-surface-2 bg-surface-2/40 p-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <GitBranch className="h-3.5 w-3.5 text-text-secondary" />
              <span>Branch Safety</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-400">
              Compliant
            </div>
            <div className="text-[10px] text-text-secondary">0 non-main branches</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-2 pt-4">
          <div className="text-xs text-text-secondary">
            Last execution:{" "}
            <span className="font-mono text-text-primary">
              {report?.lastRun ? new Date(report.lastRun).toLocaleString() : "Pending trigger"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPruning}
              onClick={() => handleRunPruning(true)}
              className="text-xs"
            >
              Simulate Dry-Run
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isPruning}
              onClick={() => handleRunPruning(false)}
              className="gap-1.5 text-xs"
            >
              {isPruning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Pruning...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Run Pruning Maintenance
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
