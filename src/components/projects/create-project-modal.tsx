"use client";

import * as React from "react";
import { X, FolderPlus, GitBranch, Github, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProjectCreatedData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  repository_url?: string | null;
  default_branch?: string;
  status: string;
}

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: ProjectCreatedData) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [repositoryUrl, setRepositoryUrl] = React.useState("");
  const [defaultBranch, setDefaultBranch] = React.useState("main");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          repositoryUrl: repositoryUrl.trim() || undefined,
          defaultBranch: defaultBranch.trim() || "main",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setName("");
      setDescription("");
      setRepositoryUrl("");
      setDefaultBranch("main");
      onSuccess(data.project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface-1 border border-surface-3 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3 bg-surface-2/40">
          <div className="flex items-center gap-2.5 text-text-primary">
            <div className="p-1.5 rounded-lg bg-surface-2 border border-surface-3 text-accent-cyan">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h2 id="create-project-title" className="text-base font-semibold">
              Create New Project
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
              Project Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Autonomous E-Commerce Engine"
              className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the high-level objective and deliverables of this project..."
              className="w-full p-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan transition-colors resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" />
              Repository URL
            </label>
            <input
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-accent-cyan" />
              Default Branch
            </label>
            <input
              type="text"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              placeholder="main"
              className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-surface-3 text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-cyan transition-colors"
            />
            <p className="text-[11px] text-text-secondary/70">
              Jarvis operates under a branchless discipline targeting <span className="font-mono text-accent-cyan">main</span>.
            </p>
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
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
