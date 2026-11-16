"use client";

import * as React from "react";
import { X, PlusCircle, AlertCircle, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanTask } from "./kanban-task-card";

export interface CreateTaskModalProps {
  isOpen: boolean;
  projectId: string;
  milestones: { id: string; title: string; sequence_order: number }[];
  onClose: () => void;
  onSuccess: (task: KanbanTask) => void;
}

export function CreateTaskModal({
  isOpen,
  projectId,
  milestones = [],
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<"low" | "medium" | "high" | "critical">("medium");
  const [riskLevel, setRiskLevel] = React.useState<"low" | "medium" | "high">("low");
  const [estimatedCostInr, setEstimatedCostInr] = React.useState<number>(0);
  const [milestoneId, setMilestoneId] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          riskLevel,
          estimatedCostInr: Number(estimatedCostInr) || 0,
          milestoneId: milestoneId ? milestoneId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setTitle("");
      setDescription("");
      setPriority("medium");
      setRiskLevel("low");
      setEstimatedCostInr(0);
      setMilestoneId("");
      onSuccess(data.task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface-1 border border-surface-3 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3 bg-surface-2/40">
          <div className="flex items-center gap-2.5 text-text-primary">
            <div className="p-1.5 rounded-lg bg-surface-2 border border-surface-3 text-accent-cyan">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h2 id="create-task-title" className="text-base font-semibold">
              Add New Task
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
              Task Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth Flow or Diff Inspector"
              className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono">
              Task Prompt / Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe requirements, acceptance criteria, or goals..."
              className="w-full p-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high" | "critical")}
                className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-cyan transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono">
                Risk Level
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as "low" | "medium" | "high")}
                className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-cyan transition-colors"
              >
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono">
                Assigned Milestone
              </label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-cyan transition-colors"
              >
                <option value="">(No Milestone / Unassigned)</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    M{m.sequence_order}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                Est. Cost (INR)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedCostInr}
                onChange={(e) => setEstimatedCostInr(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-cyan transition-colors"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Add Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
