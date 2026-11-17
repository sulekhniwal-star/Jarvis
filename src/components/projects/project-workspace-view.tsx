"use client";

import * as React from "react";
import {
  Kanban,
  ListTree,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectHeader } from "./project-header";
import { ProjectKanbanBoard } from "./project-kanban-board";
import { MilestoneHierarchyView, HierarchyMilestone } from "./milestone-hierarchy-view";
import { KanbanTask } from "./kanban-task-card";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { CreateTaskModal } from "./create-task-modal";
import { TaskStatus } from "@/types/database";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";

export interface ProjectWorkspaceViewProps {
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    repository_url?: string | null;
    default_branch?: string;
    status: string;
  };
  initialMilestones: HierarchyMilestone[];
  initialTasks: KanbanTask[];
}

export function ProjectWorkspaceView({
  project,
  initialMilestones = [],
  initialTasks = [],
}: ProjectWorkspaceViewProps) {
  const {
    tasks,
    setTasks,
    transitionTaskStatus: handleStatusTransition,
  } = useRealtimeTasks({
    projectId: project.id,
    initialTasks,
  });
  const [milestones] = React.useState<HierarchyMilestone[]>(initialMilestones);
  const [viewMode, setViewMode] = React.useState<"kanban" | "hierarchy">("kanban");
  const [selectedTask, setSelectedTask] = React.useState<KanbanTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  // Compute live statistics based on current tasks state
  const stats = React.useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter((t) => t.status === "running" || t.status === "verifying").length;
    const blockedTasks = tasks.filter(
      (t) => t.status === "awaiting_approval" || t.status === "failed" || t.status === "cancelled"
    ).length;
    const backlogTasks = tasks.filter(
      (t) => t.status === "intake" || t.status === "specifying" || t.status === "planned"
    ).length;
    const completionVelocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      backlogTasks,
      completionVelocity,
    };
  }, [tasks]);

  const milestoneMap = React.useMemo(() => {
    const map = new Map<string, string>();
    milestones.forEach((m) => {
      map.set(m.id, `M${m.sequence_order}: ${m.title}`);
    });
    return map;
  }, [milestones]);

  const handleOpenDetail = (task: KanbanTask) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleTaskCreated = (newTask: KanbanTask) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTaskUpdated = (updatedTask: KanbanTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <ProjectHeader project={project} stats={stats} />

      {/* View Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-1 border border-surface-3 p-3 rounded-xl">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors ${
              viewMode === "kanban"
                ? "bg-accent-cyan/15 text-accent-cyan font-bold border border-accent-cyan/30"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("hierarchy")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors ${
              viewMode === "hierarchy"
                ? "bg-accent-cyan/15 text-accent-cyan font-bold border border-accent-cyan/30"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Milestone Hierarchy</span>
          </button>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </Button>
      </div>

      {/* Main View Area */}
      {viewMode === "kanban" ? (
        <ProjectKanbanBoard
          tasks={tasks}
          milestones={milestones}
          onOpenDetail={handleOpenDetail}
          onStatusTransition={handleStatusTransition}
        />
      ) : (
        <MilestoneHierarchyView
          milestones={milestones}
          tasks={tasks}
          onSelectTask={handleOpenDetail}
        />
      )}

      {/* Detail Slide-Over Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        milestoneName={
          selectedTask?.milestone_id
            ? milestoneMap.get(selectedTask.milestone_id)
            : undefined
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDetail}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        projectId={project.id}
        milestones={milestones}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTaskCreated}
      />
    </div>
  );
}
