"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  IndianRupee,
  ShieldAlert,
  ArrowRight,
  Check,
  Play,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskStateMachine } from "@/lib/state-machines/task-state-machine";
import { TaskStatus } from "@/types/database";

export interface KanbanTask {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  risk_level: string;
  estimated_cost_inr?: number;
  actual_cost_inr?: number;
}

export interface KanbanTaskCardProps {
  task: KanbanTask;
  milestoneName?: string;
  onOpenDetail?: (task: KanbanTask) => void;
  onStatusTransition?: (taskId: string, targetStatus: TaskStatus) => void;
  isUpdating?: boolean;
}

export function KanbanTaskCard({
  task,
  milestoneName,
  onOpenDetail,
  onStatusTransition,
  isUpdating = false,
}: KanbanTaskCardProps) {
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

  // Determine key next transition actions available for this task
  const nextActions = React.useMemo(() => {
    const current = task.status as TaskStatus;
    const actions: { target: TaskStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];

    if (TaskStateMachine.canTransition(current, "specifying") && current !== "specifying") {
      actions.push({ target: "specifying", label: "Spec", icon: ArrowRight });
    }
    if (TaskStateMachine.canTransition(current, "running") && current !== "running") {
      actions.push({ target: "running", label: "Run", icon: Play });
    }
    if (TaskStateMachine.canTransition(current, "completed") && current !== "completed") {
      actions.push({ target: "completed", label: "Done", icon: Check });
    }
    if (current === "failed" && TaskStateMachine.canTransition(current, "running")) {
      actions.push({ target: "running", label: "Retry", icon: RotateCcw });
    }

    return actions.slice(0, 2);
  }, [task.status]);

  return (
    <div
      onClick={() => onOpenDetail?.(task)}
      className="bg-surface-2/70 hover:bg-surface-2 border border-surface-3 hover:border-accent-cyan/40 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-accent-cyan/5 group space-y-3 relative overflow-hidden"
    >
      {/* Priority & Status Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <Badge variant={getPriorityVariant(task.priority)} className="text-[10px] uppercase font-mono">
          {task.priority}
        </Badge>
        <Badge variant={getStatusVariant(task.status)} className="text-[10px] font-mono">
          {task.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Task Title & Description */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent-cyan transition-colors line-clamp-2 leading-snug">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Milestone & Cost Info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary pt-2 border-t border-surface-3/50">
        <span className="truncate max-w-[120px] text-text-secondary/80">
          {milestoneName || "No milestone"}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.risk_level === "high" && (
            <span className="text-danger flex items-center gap-0.5" title="High Risk">
              <ShieldAlert className="w-3 h-3" />
            </span>
          )}
          {task.estimated_cost_inr !== undefined && (
            <span className="flex items-center text-text-primary">
              <IndianRupee className="w-3 h-3 text-text-secondary" />
              {task.estimated_cost_inr.toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Transitions & Plan Link */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-3/30 text-xs">
        <Link
          href={`/tasks/${task.id}/plan`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-text-secondary hover:text-accent-cyan flex items-center gap-1 transition-colors font-mono"
          title="Open Plan Review"
        >
          <span>Plan</span>
          <ExternalLink className="w-3 h-3" />
        </Link>

        {nextActions.length > 0 && onStatusTransition && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {nextActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.target}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onStatusTransition(task.id, action.target)}
                  className="px-2 py-0.5 rounded bg-surface-3/80 hover:bg-accent-cyan/20 hover:text-accent-cyan text-text-secondary text-[10px] font-mono font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
