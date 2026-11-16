"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Layers,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskStateMachine } from "@/lib/state-machines/task-state-machine";
import { TaskStatus } from "@/types/database";
import { KanbanTask } from "./kanban-task-card";

export interface TaskSpecificationDetails {
  id?: string;
  version?: number;
  scope?: string;
  exclusions?: string;
  acceptance_criteria?: string[];
}

export interface TaskPlanDetails {
  id?: string;
  risk_level?: string;
  steps?: { title: string }[];
}

export interface TaskRunDetails {
  id: string;
  status: string;
  agent_engine: string;
  exit_code?: number;
}

export interface TaskDetailDrawerProps {
  task: KanbanTask | null;
  milestoneName?: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (updatedTask: KanbanTask) => void;
}

export function TaskDetailDrawer({
  task,
  milestoneName,
  isOpen,
  onClose,
  onTaskUpdated,
}: TaskDetailDrawerProps) {
  const [details, setDetails] = React.useState<{
    specification?: TaskSpecificationDetails | null;
    plan?: TaskPlanDetails | null;
    runs?: TaskRunDetails[];
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !task) {
      setDetails(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/tasks/${task.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load task details");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setDetails({
            specification: data.specification,
            plan: data.plan,
            runs: data.runs,
          });
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleTransition = async (targetStatus: TaskStatus) => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update task status");
      }

      onTaskUpdated?.(data.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
      case "critical":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "cyan";
      default:
        return "outline";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "running":
      case "verifying":
        return "cyan";
      case "awaiting_approval":
      case "failed":
        return "danger";
      default:
        return "outline";
    }
  };

  const current = task.status as TaskStatus;
  const legalNextStates: TaskStatus[] = [
    "specifying",
    "planned",
    "running",
    "verifying",
    "completed",
    "cancelled",
    "failed",
  ].filter((s) => s !== current && TaskStateMachine.canTransition(current, s as TaskStatus)) as TaskStatus[];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
      className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface-1 border-l border-surface-3 w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-surface-3 bg-surface-2/40 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(task.status)}>
                {task.status.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge variant={getPriorityVariant(task.priority)}>
                {task.priority.toUpperCase()}
              </Badge>
              {task.risk_level === "high" ? (
                <Badge variant="danger" className="gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  HIGH RISK
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {task.risk_level.toUpperCase()} RISK
                </Badge>
              )}
            </div>
            <h2 id="task-detail-title" className="text-lg font-bold text-text-primary tracking-tight">
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-2 border border-surface-3 text-xs font-mono">
            <div>
              <div className="text-text-secondary text-[11px]">Milestone</div>
              <div className="text-text-primary font-medium mt-0.5 truncate">
                {milestoneName || "Unassigned"}
              </div>
            </div>
            <div>
              <div className="text-text-secondary text-[11px]">Cost (Est / Actual)</div>
              <div className="text-text-primary font-medium mt-0.5 flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-text-secondary" />
                <span>{(task.estimated_cost_inr ?? 0).toFixed(2)}</span>
                <span className="text-text-secondary">/</span>
                <span>{(task.actual_cost_inr ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono">
                Task Prompt / Description
              </h3>
              <div className="p-3.5 rounded-lg bg-surface-2/60 border border-surface-3 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {task.description}
              </div>
            </div>
          )}

          {/* Linked Specification Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                Linked Specification
              </h3>
              {details?.specification?.version && (
                <span className="text-[10px] font-mono text-text-secondary px-2 py-0.5 rounded bg-surface-2 border border-surface-3">
                  v{details.specification.version}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="p-4 text-xs text-text-secondary text-center animate-pulse">
                Loading specification...
              </div>
            ) : details?.specification ? (
              <div className="p-4 rounded-xl bg-surface-2/50 border border-surface-3 space-y-3">
                {details.specification.scope && (
                  <div>
                    <div className="text-[11px] font-semibold text-text-secondary uppercase font-mono">Scope</div>
                    <div className="text-xs text-text-primary mt-1">{details.specification.scope}</div>
                  </div>
                )}
                {details.specification.acceptance_criteria && details.specification.acceptance_criteria.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-text-secondary uppercase font-mono">
                      Acceptance Criteria ({details.specification.acceptance_criteria.length})
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {details.specification.acceptance_criteria.map((crit: string, idx: number) => (
                        <li key={idx} className="text-xs text-text-primary flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                          <span>{crit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-2/30 border border-surface-3 text-xs text-text-secondary text-center">
                No formal specification generated yet.
              </div>
            )}
          </div>

          {/* Linked Plan Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
              Execution Plan
            </h3>

            {isLoading ? (
              <div className="p-4 text-xs text-text-secondary text-center animate-pulse">
                Loading plan...
              </div>
            ) : details?.plan ? (
              <div className="p-4 rounded-xl bg-surface-2/50 border border-surface-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-text-primary">
                    Execution Plan ({details.plan.steps?.length ?? 0} DAG steps)
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono">
                    Risk Assessment: {details.plan.risk_level?.toUpperCase() || "LOW"}
                  </div>
                </div>
                <Link href={`/tasks/${task.id}/plan`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <span>Review Plan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-2/30 border border-surface-3 text-xs text-text-secondary text-center">
                Plan has not been generated for this task yet.
              </div>
            )}
          </div>

          {/* Agent Runs History */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              Agent Runs History
            </h3>

            {details?.runs && details.runs.length > 0 ? (
              <div className="space-y-2">
                {details.runs.slice(0, 3).map((run: TaskRunDetails) => (
                  <div
                    key={run.id}
                    className="p-3 rounded-lg bg-surface-2 border border-surface-3 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "cyan"}>
                        {run.status}
                      </Badge>
                      <span className="text-text-secondary text-[11px]">engine: {run.agent_engine}</span>
                    </div>
                    {run.exit_code !== undefined && (
                      <span className="text-[11px] text-text-secondary">code: {run.exit_code}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-surface-2/30 border border-surface-3 text-xs text-text-secondary text-center">
                No agent execution runs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-3 bg-surface-2/40 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-text-secondary font-mono">
            State Actions:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {legalNextStates.map((nextState) => (
              <Button
                key={nextState}
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleTransition(nextState)}
                className="gap-1 text-xs capitalize"
              >
                <ArrowRight className="w-3 h-3 text-accent-cyan" />
                <span>{nextState.replace("_", " ")}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
