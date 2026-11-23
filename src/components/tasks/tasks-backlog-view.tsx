"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Filter, ListTodo, ExternalLink, AlertCircle, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/repositories/types";

export interface TasksBacklogViewProps {
  initialTasks: Task[];
}

export function TasksBacklogView({ initialTasks }: TasksBacklogViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const filteredTasks = React.useMemo(() => {
    return initialTasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter ||
        (statusFilter === "active" && ["intake", "specified", "planned", "running", "verifying"].includes(task.status));

      return matchesSearch && matchesStatus;
    });
  }, [initialTasks, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            <span>Completed</span>
          </Badge>
        );
      case "running":
      case "verifying":
        return (
          <Badge variant="cyan" pulse={true} className="flex items-center gap-1">
            <PlayCircle className="w-3 h-3" aria-hidden="true" />
            <span>Running</span>
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
            <span>Failed</span>
          </Badge>
        );
      case "planned":
      case "awaiting_approval":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>Planned</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <ListTodo className="w-3 h-3" aria-hidden="true" />
            <span className="capitalize">{status}</span>
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <span className="text-xs font-semibold text-rose-400">Critical Priority</span>;
      case "high":
        return <span className="text-xs font-semibold text-amber-400">High Priority</span>;
      case "low":
        return <span className="text-xs font-medium text-slate-400">Low Priority</span>;
      default:
        return <span className="text-xs font-medium text-slate-300">Medium Priority</span>;
    }
  };

  return (
    <section aria-labelledby="tasks-backlog-heading" className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="tasks-backlog-heading" className="text-2xl font-bold text-text-primary tracking-tight">
            Tasks Backlog
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Review, track, and inspect autonomous task specifications, execution plans, and lifecycle states.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              aria-label="Search tasks by title or description"
              className="w-full pl-9 pr-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-1 border border-surface-3 p-1 rounded-lg" role="group" aria-label="Filter tasks by status">
            {["all", "active", "completed", "failed"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`px-3 py-1.5 text-xs font-medium rounded-md min-h-[36px] transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan ${
                  statusFilter === status
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-surface-3 bg-surface-1/50 text-center py-12">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-2 border border-surface-3 flex items-center justify-center mx-auto text-text-muted">
              <Filter className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">No tasks found</h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No tasks match your current search and filter criteria. Try clearing your filters."
                : "No tasks have been queued yet. Intake a new task via Telegram or the web interface."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4" role="list" aria-label="Tasks backlog list">
          {filteredTasks.map((task) => (
            <li key={task.id}>
              <Card className="hover:border-surface-4 transition-all focus-within:ring-2 focus-within:ring-accent-cyan">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      <CardTitle className="text-base font-semibold text-text-primary">
                        {task.title}
                      </CardTitle>
                    </div>

                    <Link
                      href={`/tasks/${task.id}/plan`}
                      aria-label={`Review plan and details for task: ${task.title}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-surface-2 hover:bg-surface-3 text-accent-cyan border border-accent-cyan/20 focus:outline-none focus:ring-2 focus:ring-accent-cyan transition-colors self-start sm:self-auto min-h-[44px] min-w-[44px]"
                    >
                      <span>Review Plan</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </CardHeader>

                {task.description && (
                  <CardContent className="pt-0 pb-4 text-xs text-text-secondary line-clamp-2">
                    {task.description}
                  </CardContent>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
