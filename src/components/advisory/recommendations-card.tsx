"use client";

import * as React from "react";
import {
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Wrench,
  X,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdvisoryReport,
  MaintenanceRecommendation,
  RecommendationSeverity,
} from "@/lib/advisory/types";

export interface RecommendationsCardProps {
  initialReport?: AdvisoryReport | null;
}

export function RecommendationsCard({ initialReport = null }: RecommendationsCardProps) {
  const [report, setReport] = React.useState<AdvisoryReport | null>(initialReport);
  const [isLoading, setIsLoading] = React.useState(!initialReport);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchAdvisory = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/advisory");
      if (!res.ok) {
        throw new Error(`Failed to fetch advisory report (${res.status})`);
      }
      const data: AdvisoryReport = await res.json();
      setReport(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      setIsLoading(false);
    } else {
      fetchAdvisory();
    }
  }, [initialReport, fetchAdvisory]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleExecuteRemediation = async (recommendation: MaintenanceRecommendation) => {
    if (!recommendation.remediation) return;

    setExecutingId(recommendation.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/advisory/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: recommendation.remediation.type,
          params: recommendation.remediation.payload || {},
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || "Remediation action failed");
      }

      setStatusMessage(result.message || `Remediation action '${recommendation.remediation.label}' executed successfully.`);
      // Dismiss the remediated recommendation and refresh report
      setDismissedIds((prev) => new Set([...prev, recommendation.id]));
      fetchAdvisory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setExecutingId(null);
    }
  };

  const visibleRecommendations = (report?.recommendations || []).filter(
    (rec) => !dismissedIds.has(rec.id)
  );

  const getSeverityBadge = (severity: RecommendationSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <Badge variant="danger" className="gap-1 py-0.5 text-[11px]">
            <AlertCircle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="warning" className="gap-1 py-0.5 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </Badge>
        );
      case "info":
      default:
        return (
          <Badge variant="outline" className="gap-1 py-0.5 text-[11px] text-sky-400 border-sky-500/30">
            <Info className="h-3 w-3" />
            Advisory
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-surface-3 bg-surface-1 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-brand-primary">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-text-primary">
                Proactive Maintenance & Advisory Engine
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                REQ-OPS-04 diagnostic reasoning & REQ-OPS-05 1-click remediation actions
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report && report.criticalCount > 0 && (
              <span className="rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 border border-red-500/20">
                {report.criticalCount} Critical
              </span>
            )}
            {report && report.warningCount > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                {report.warningCount} Warning
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={fetchAdvisory}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Alerts */}
        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Empty State: Zero Recommendations */}
        {visibleRecommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-surface-2 bg-surface-2/30 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
            <h4 className="text-sm font-semibold text-text-primary">
              All Systems Nominal — Zero Maintenance Warnings
            </h4>
            <p className="mt-1 text-xs text-text-secondary max-w-md">
              No budget cap overruns, model latency anomalies, repeated test regressions, or git branch safety violations detected.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecommendations.map((rec) => {
              const isExecuting = executingId === rec.id;
              const severityBorder =
                rec.severity === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : rec.severity === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-sky-500/30 bg-sky-500/5";

              return (
                <div
                  key={rec.id}
                  className={`rounded-lg border p-4 transition-all ${severityBorder}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityBadge(rec.severity)}
                        <span className="font-mono text-[10px] uppercase text-text-secondary">
                          {rec.category.replace("_", " ")}
                        </span>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {rec.title}
                        </h4>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {rec.description}
                      </p>
                      <div className="rounded border border-surface-3 bg-surface-1/70 px-2.5 py-1.5 text-[11px] text-text-secondary">
                        <span className="font-medium text-text-primary">Diagnostic Rationale: </span>
                        {rec.rationale}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {rec.remediation && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isExecuting}
                          onClick={() => handleExecuteRemediation(rec)}
                          className="gap-1.5 text-xs"
                        >
                          {isExecuting ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Remediating...
                            </>
                          ) : (
                            <>
                              <Wrench className="h-3.5 w-3.5" />
                              {rec.remediation.label}
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(rec.id)}
                        className="text-text-secondary hover:text-text-primary p-1.5"
                        title="Dismiss recommendation"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
