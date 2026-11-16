import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  GitBranch,
  Github,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    repository_url?: string | null;
    default_branch?: string;
    status: string;
  };
  stats?: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    backlogTasks: number;
    completionVelocity: number;
  };
}

export function ProjectHeader({ project, stats }: ProjectHeaderProps) {
  const velocity = stats?.completionVelocity ?? 0;
  const total = stats?.totalTasks ?? 0;
  const completed = stats?.completedTasks ?? 0;
  const inProgress = stats?.inProgressTasks ?? 0;
  const blocked = stats?.blockedTasks ?? 0;

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-secondary font-mono">
        <Link href="/" className="hover:text-accent-cyan transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3 h-3 text-text-secondary/50" />
        <Link href="/projects" className="hover:text-accent-cyan transition-colors">
          Projects
        </Link>
        <ChevronRight className="w-3 h-3 text-text-secondary/50" />
        <span className="text-text-primary font-medium">{project.name}</span>
      </nav>

      {/* Main Header Card */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 relative overflow-hidden">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-cyan via-accent-ice to-accent-cyan/20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Project Details */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 rounded-lg bg-surface-2 border border-surface-3 text-accent-cyan">
                <FolderKanban className="w-5 h-5" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {project.name}
              </h1>
              <Badge
                variant={project.status === "active" ? "cyan" : "outline"}
                pulse={project.status === "active"}
              >
                {project.status.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px]">
                {project.slug}
              </Badge>
            </div>

            {project.description && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {project.description}
              </p>
            )}

            {/* Repository Info */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-text-secondary font-mono">
              {project.repository_url && (
                <a
                  href={project.repository_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-accent-cyan transition-colors underline-offset-4 hover:underline"
                >
                  <Github className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{project.repository_url.replace(/^https?:\/\/github\.com\//, "")}</span>
                </a>
              )}
              <div className="flex items-center gap-1 text-text-secondary/80">
                <GitBranch className="w-3.5 h-3.5 text-accent-cyan" aria-hidden="true" />
                <span>branch: {project.default_branch || "main"}</span>
              </div>
            </div>
          </div>

          {/* Completion Velocity Meter */}
          <div className="bg-surface-2 border border-surface-3 rounded-lg p-4 min-w-[280px] lg:w-72 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                Completion Velocity
              </span>
              <span className="font-mono font-bold text-accent-cyan text-sm">{velocity}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-cyan to-accent-ice transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, velocity))}%` }}
                role="progressbar"
                aria-valuenow={velocity}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Completion velocity ${velocity}%`}
              />
            </div>

            {/* Mini Metrics Grid */}
            <div className="grid grid-cols-4 gap-1 text-center pt-1 border-t border-surface-3/50 text-[11px] font-mono">
              <div>
                <div className="text-text-primary font-bold">{total}</div>
                <div className="text-[9px] text-text-secondary uppercase">Tasks</div>
              </div>
              <div>
                <div className="text-success font-bold flex items-center justify-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {completed}
                </div>
                <div className="text-[9px] text-text-secondary uppercase">Done</div>
              </div>
              <div>
                <div className="text-accent-cyan font-bold flex items-center justify-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {inProgress}
                </div>
                <div className="text-[9px] text-text-secondary uppercase">Active</div>
              </div>
              <div>
                <div className="text-danger font-bold flex items-center justify-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {blocked}
                </div>
                <div className="text-[9px] text-text-secondary uppercase">Blocked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
