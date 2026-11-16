"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flag,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  IndianRupee,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface HierarchyTask {
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

export interface HierarchyMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  sequence_order: number;
  status: string;
}

export interface MilestoneHierarchyViewProps {
  milestones: HierarchyMilestone[];
  tasks: HierarchyTask[];
  onSelectTask?: (task: HierarchyTask) => void;
}

export function MilestoneHierarchyView({
  milestones,
  tasks,
  onSelectTask,
}: MilestoneHierarchyViewProps) {
  // Collapsed state map for milestones
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getPriorityBadgeVariant = (priority: string) => {
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

  const getStatusBadgeVariant = (status: string) => {
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

  // Group tasks by milestone_id (or unassigned)
  const tasksByMilestone = React.useMemo(() => {
    const map = new Map<string, HierarchyTask[]>();
    const unassigned: HierarchyTask[] = [];

    tasks.forEach((t) => {
      if (t.milestone_id) {
        const list = map.get(t.milestone_id) ?? [];
        list.push(t);
        map.set(t.milestone_id, list);
      } else {
        unassigned.push(t);
      }
    });

    return { map, unassigned };
  }, [tasks]);

  if (milestones.length === 0 && tasks.length === 0) {
    return (
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-surface-2 border border-surface-3 text-text-secondary mx-auto flex items-center justify-center">
          <Flag className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-text-primary">No Milestones or Tasks Yet</h3>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          This project has no milestones defined. You can create tasks or initialize the milestone structure.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {milestones.map((milestone) => {
        const milestoneTasks = tasksByMilestone.map.get(milestone.id) ?? [];
        const isCollapsed = collapsed[milestone.id] ?? false;

        const total = milestoneTasks.length;
        const done = milestoneTasks.filter((t) => t.status === "completed").length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div
            key={milestone.id}
            className="bg-surface-1 border border-surface-3 rounded-xl overflow-hidden transition-all"
          >
            {/* Milestone Header */}
            <div
              onClick={() => toggleCollapse(milestone.id)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-2/40 transition-colors select-none"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label={isCollapsed ? "Expand milestone" : "Collapse milestone"}
                  className="p-1 rounded text-text-secondary hover:text-accent-cyan transition-colors mt-0.5"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-surface-3 text-accent-cyan">
                      M{milestone.sequence_order}
                    </span>
                    <h3 className="text-base font-semibold text-text-primary">
                      {milestone.title}
                    </h3>
                    <Badge variant={milestone.status === "completed" ? "success" : "outline"}>
                      {milestone.status.toUpperCase()}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-text-secondary line-clamp-1">
                      {milestone.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="flex items-center gap-4 sm:self-center ml-7 sm:ml-0">
                <div className="w-28 sm:w-36 space-y-1 text-right">
                  <div className="flex justify-between text-[11px] font-mono text-text-secondary">
                    <span>{done}/{total} done</span>
                    <span className="font-bold text-accent-cyan">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Nested Tasks */}
            {!isCollapsed && (
              <div className="border-t border-surface-3 bg-surface-2/20 divide-y divide-surface-3/50">
                {milestoneTasks.length === 0 ? (
                  <div className="p-4 text-xs text-text-secondary italic text-center">
                    No tasks assigned to this milestone yet.
                  </div>
                ) : (
                  milestoneTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask?.(task)}
                      className="p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-surface-2/60 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(task.status)}>
                            {task.status.replace("_", " ")}
                          </Badge>
                          <span className="text-sm font-medium text-text-primary group-hover:text-accent-cyan transition-colors truncate">
                            {task.title}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-text-secondary line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs font-mono self-start sm:self-center flex-shrink-0">
                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.estimated_cost_inr !== undefined && (
                          <span className="text-text-secondary flex items-center text-[11px]">
                            <IndianRupee className="w-3 h-3 text-text-secondary" />
                            {task.estimated_cost_inr.toFixed(2)}
                          </span>
                        )}
                        <Link
                          href={`/tasks/${task.id}/plan`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-text-secondary hover:text-accent-cyan transition-colors rounded"
                          title="View Execution Plan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned Tasks Section (if any) */}
      {tasksByMilestone.unassigned.length > 0 && (
        <div className="bg-surface-1 border border-dashed border-surface-3 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider font-mono">
              Unassigned Tasks ({tasksByMilestone.unassigned.length})
            </h4>
          </div>
          <div className="divide-y divide-surface-3/50">
            {tasksByMilestone.unassigned.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task)}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-surface-2/40 px-2 rounded cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Badge variant={getStatusBadgeVariant(task.status)}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-text-primary group-hover:text-accent-cyan transition-colors truncate">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Badge variant={getPriorityBadgeVariant(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
