"use client";

import * as React from "react";
import {
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { KanbanTaskCard, KanbanTask } from "./kanban-task-card";
import { TaskStatus } from "@/types/database";

export interface ProjectKanbanBoardProps {
  tasks: KanbanTask[];
  milestones?: { id: string; title: string; sequence_order: number }[];
  onOpenDetail?: (task: KanbanTask) => void;
  onStatusTransition?: (taskId: string, targetStatus: TaskStatus) => void;
}

interface ColumnConfig {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  statuses: TaskStatus[];
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "backlog",
    title: "Backlog",
    icon: ListTodo,
    accentColor: "border-text-secondary/40 text-text-secondary",
    statuses: ["intake", "specifying", "planned"],
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Clock,
    accentColor: "border-accent-cyan/60 text-accent-cyan",
    statuses: ["running", "verifying"],
  },
  {
    id: "blocked",
    title: "Review & Blocked",
    icon: AlertTriangle,
    accentColor: "border-warning/60 text-warning",
    statuses: ["awaiting_approval", "failed", "cancelled"],
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle2,
    accentColor: "border-success/60 text-success",
    statuses: ["completed"],
  },
];

export function ProjectKanbanBoard({
  tasks,
  milestones = [],
  onOpenDetail,
  onStatusTransition,
}: ProjectKanbanBoardProps) {
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  const milestoneMap = React.useMemo(() => {
    const map = new Map<string, string>();
    milestones.forEach((m) => {
      map.set(m.id, `M${m.sequence_order}: ${m.title}`);
    });
    return map;
  }, [milestones]);

  const filteredTasks = React.useMemo(() => {
    if (priorityFilter === "all") return tasks;
    return tasks.filter((t) => t.priority.toLowerCase() === priorityFilter.toLowerCase());
  }, [tasks, priorityFilter]);

  return (
    <div className="space-y-4">
      {/* Board Controls */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-secondary font-mono">
          <Filter className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Priority Filter:</span>
          {["all", "critical", "high", "medium", "low"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
                priorityFilter === p
                  ? "bg-accent-cyan/15 text-accent-cyan font-bold border border-accent-cyan/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) =>
            column.statuses.includes(t.status as TaskStatus)
          );
          const Icon = column.icon;

          return (
            <div
              key={column.id}
              className="bg-surface-1 border border-surface-3 rounded-xl p-3.5 flex flex-col space-y-3 min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-surface-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${column.accentColor}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-text-primary">
                    {column.title}
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-2 border border-surface-3 text-text-secondary">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-32 border border-dashed border-surface-3 rounded-lg flex items-center justify-center text-xs text-text-secondary/60 italic text-center p-4">
                    No tasks in {column.title.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      milestoneName={task.milestone_id ? milestoneMap.get(task.milestone_id) : undefined}
                      onOpenDetail={onOpenDetail}
                      onStatusTransition={onStatusTransition}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
