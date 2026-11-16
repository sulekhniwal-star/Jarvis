"use client";

import * as React from "react";
import { X, Brain, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryCategory } from "@/types/database";

export interface ProjectOption {
  id: string;
  name: string;
  slug: string;
}

export interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (memory: any) => void;
  projects?: ProjectOption[];
}

export function CreateMemoryModal({
  isOpen,
  onClose,
  onCreated,
  projects = [],
}: CreateMemoryModalProps) {
  const [category, setCategory] = React.useState<MemoryCategory>("project_decision");
  const [projectId, setProjectId] = React.useState<string>("");
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 5) {
      setError("Memory content must be at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          content: content.trim(),
          projectId: projectId || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create memory");
      }

      onCreated(data.memory);
      setContent("");
      setProjectId("");
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-memory-title"
    >
      <div className="w-full max-w-lg bg-surface-1 border border-surface-3 rounded-xl p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 id="create-memory-title" className="text-base font-bold text-text-primary">
                Add Knowledge Memory
              </h3>
              <p className="text-xs text-text-secondary">
                Curate architectural decisions, preferences, and historical guidelines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="block font-medium text-text-primary">
              Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            >
              <option value="project_decision">Project Decision (ADRs & architectural decisions)</option>
              <option value="user_preference">User Preference (Coding conventions & style preferences)</option>
              <option value="architecture_pattern">Architecture Pattern (Reusable patterns & structure)</option>
              <option value="historical_error">Historical Error (Mistakes to avoid & regressions)</option>
            </select>
          </div>

          {/* Project Association */}
          <div className="space-y-1.5">
            <label className="block font-medium text-text-primary">
              Scope / Project (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            >
              <option value="">Global Memory (Applies to all projects)</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  Project: {proj.name} ({proj.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label className="block font-medium text-text-primary">
              Guideline / Decision Content <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Always use Supabase server-side client with createClient in Next.js Server Components. Avoid using browser auth tokens on server routes."
              className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan leading-relaxed"
            />
            <p className="text-[11px] text-text-secondary/70">
              Vector embedding (1536-dim) will be computed automatically for semantic retrieval.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-surface-3 bg-surface-2 text-text-secondary hover:text-text-primary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-accent-cyan text-surface-base font-semibold"
            >
              {isSubmitting ? "Generating Embedding..." : "Save Memory"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

