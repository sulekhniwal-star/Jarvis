import React from "react";
import Link from "next/link";
import { ArrowLeft, Layers, GitBranch, FileCode2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface PlanReviewHeaderProps {
  taskTitle: string;
  taskId: string;
  projectId?: string;
  planVersion: number;
  taskStatus: string;
  totalSteps: number;
  totalWaves: number;
  totalFiles: number;
}

export function PlanReviewHeader({
  taskTitle,
  taskId,
  projectId,
  planVersion,
  taskStatus,
  totalSteps,
  totalWaves,
  totalFiles,
}: PlanReviewHeaderProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "running":
        return "cyan";
      case "awaiting_approval":
      case "pending_approval":
        return "warning";
      case "planned":
        return "ice";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4 border-b border-white/10 pb-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span>Tasks</span>
        <span>/</span>
        <span className="text-slate-200 font-mono">{taskId.slice(0, 8)}...</span>
        <span>/</span>
        <span className="text-cyan-400 font-medium">Plan Review</span>
      </div>

      {/* Title & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {taskTitle}
            </h1>
            <Badge variant="outline" className="font-mono text-cyan-400 border-cyan-500/30">
              Plan v{planVersion}
            </Badge>
            <Badge variant={getStatusVariant(taskStatus)} className="capitalize">
              {taskStatus.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            Review proposed execution steps, dependency order, file targets, and risk profile.
          </p>
        </div>

        {/* Statistical Summary Pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 border border-white/10 text-slate-300">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>
              <strong className="text-white">{totalWaves}</strong> Waves
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 border border-white/10 text-slate-300">
            <GitBranch className="h-4 w-4 text-indigo-400" />
            <span>
              <strong className="text-white">{totalSteps}</strong> Steps
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 border border-white/10 text-slate-300">
            <FileCode2 className="h-4 w-4 text-emerald-400" />
            <span>
              <strong className="text-white">{totalFiles}</strong> Files
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
