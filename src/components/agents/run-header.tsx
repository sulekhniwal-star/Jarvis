"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  GitCommit,
  Cpu,
  Folder,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "./agents-console-view";
import { AgentRunStatus } from "@/types/database";

export interface RunHeaderProps {
  run: {
    id: string;
    agent_engine: string;
    status: AgentRunStatus;
    git_commit_hash?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    durationMs?: number | null;
  };
  task?: {
    id: string;
    title: string;
    priority?: string;
  } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function RunHeader({ run, task, project }: RunHeaderProps) {
  const shortId = run.id.slice(0, 8);

  const durationMs =
    run.durationMs ??
    (run.started_at && run.completed_at
      ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
      : null);

  const renderStatusBadge = () => {
    switch (run.status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Completed
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse px-2.5 py-1 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Running
          </Badge>
        );
      case "verifying":
        return (
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse px-2.5 py-1 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Verifying
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 px-2.5 py-1 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Failed
          </Badge>
        );
      case "timed_out":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 px-2.5 py-1 text-xs">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Timed Out
          </Badge>
        );
      case "queued":
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-2.5 py-1 text-xs">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Queued
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <Link
          href="/"
          className="hover:text-text-primary transition-colors flex items-center gap-1"
        >
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-secondary/50" />
        <Link
          href="/agents"
          className="hover:text-text-primary transition-colors flex items-center gap-1"
        >
          Agents
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-secondary/50" />
        <span className="text-text-primary font-mono font-medium">
          Run #{shortId}
        </span>
      </div>

      {/* Main Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-1 p-5 rounded-lg border border-surface-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/agents"
              className="p-1.5 rounded-md bg-surface-2 hover:bg-surface-3 border border-surface-3 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Back to Agent Console"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight font-mono">
              run-{shortId}
            </h1>
            {renderStatusBadge()}
            <Badge
              variant="outline"
              className="bg-surface-2 border-surface-3 text-text-secondary text-xs font-mono flex items-center gap-1"
            >
              <Cpu className="w-3 h-3 text-accent-cyan" />
              {run.agent_engine}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary pt-1">
            {task && (
              <div className="flex items-center gap-1.5 text-text-primary font-medium">
                <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                <span>{task.title}</span>
              </div>
            )}
            {project && (
              <div className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-text-secondary/70" />
                <Link
                  href={`/projects/${project.id}`}
                  className="hover:text-accent-cyan hover:underline transition-colors"
                >
                  {project.name}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-text-secondary/70" />
              <span>Duration: {formatDuration(durationMs)}</span>
            </div>
            {run.git_commit_hash && (
              <div className="flex items-center gap-1.5 font-mono">
                <GitCommit className="w-3.5 h-3.5 text-accent-cyan" />
                <span>{run.git_commit_hash.slice(0, 7)}</span>
              </div>
            )}
          </div>
        </div>

        {project && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors border border-surface-3 bg-surface-2 hover:bg-surface-3 text-text-primary h-8 px-3 text-xs"
            >
              View Project Workspace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
