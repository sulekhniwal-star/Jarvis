"use client";

import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  FileCode,
  RefreshCw,
  Terminal,
  XCircle,
} from "lucide-react";
import { TaskItem } from "../../utils/api";

interface MissionManifestProps {
  tasks: TaskItem[];
  handleApproveTask: (taskId: string) => void;
  handleRejectTask: (taskId: string) => void;
  handleRetryTask: (taskId: string) => void;
  onInspectLogs: (task: TaskItem) => void;
  onViewDiff: (task: TaskItem) => void;
}

export function MissionManifest({
  tasks,
  handleApproveTask,
  handleRejectTask,
  handleRetryTask,
  onInspectLogs,
  onViewDiff,
}: MissionManifestProps) {
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "APPROVAL" | "COMPLETED" | "FAILED">("ALL");

  const filteredTasks = tasks.filter((t) => {
    if (filterTab === "ALL") return true;
    if (filterTab === "ACTIVE")
      return ["PLANNING", "EXECUTING", "TESTING", "DIAGNOSING"].includes(t.status);
    if (filterTab === "APPROVAL")
      return ["PENDING", "AWAITING_APPROVAL"].includes(t.status);
    if (filterTab === "COMPLETED") return t.status === "COMPLETED";
    if (filterTab === "FAILED") return ["FAILED", "CANCELLED"].includes(t.status);
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Manifest Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
            Active Mission Manifest
          </h2>
          <span className="text-xs font-mono text-gray-500">({tasks.length} total)</span>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 border border-cyan-500/30 bg-black/40 p-1 rounded font-mono text-xs overflow-x-auto">
          {(["ALL", "ACTIVE", "APPROVAL", "COMPLETED", "FAILED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                filterTab === tab
                  ? "bg-cyan-500 text-black shadow-[0_0_8px_#00e5ff]"
                  : "text-gray-400 hover:text-cyan-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="border border-cyan-500/20 bg-black/30 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500 font-mono">
              No missions found matching the selected filter ({filterTab}).
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const steps = task.steps || [];
            const prStep = steps.find(
              (s: any) =>
                s.description?.includes("http") &&
                (s.name.toLowerCase().includes("pull request") || s.name.toLowerCase().includes("pr"))
            );
            const prUrlMatch = prStep?.description?.match(/https:\/\/[^\s]+/);
            const prUrl = prUrlMatch ? prUrlMatch[0] : null;

            return (
              <div
                key={task.id}
                className="border border-cyan-500/30 bg-[#040c17]/90 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden transition-all hover:border-cyan-400/60 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
              >
                {/* Top Row: Title, Priority, Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded">
                      {task.id.slice(0, 8)}
                    </span>
                    <h3 className="text-sm font-bold text-gray-100">{task.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        task.priority.includes("CRITICAL")
                          ? "bg-rose-950 text-rose-300 border border-rose-500/50"
                          : task.priority.includes("HIGH")
                          ? "bg-amber-950 text-amber-300 border border-amber-500/50"
                          : "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                      }`}
                    >
                      {task.priority}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5 ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : task.status === "FAILED" || task.status === "CANCELLED"
                          ? "bg-rose-950 text-rose-300 border border-rose-500/50"
                          : "bg-cyan-950 text-cyan-300 border border-cyan-500/50 animate-pulse"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-400"
                            : task.status === "FAILED" || task.status === "CANCELLED"
                            ? "bg-rose-400"
                            : "bg-cyan-400 animate-ping"
                        }`}
                      />
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-xs text-gray-400 font-mono mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1">
                    <span>
                      EXECUTION PROGRESS ({task.completedSteps} / {task.stepsCount} STEPS)
                    </span>
                    <span className="text-cyan-300 font-bold">
                      {Math.round((task.completedSteps / Math.max(1, task.stepsCount)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-cyan-950/60 h-1.5 rounded overflow-hidden border border-cyan-500/20">
                    <div
                      className={`h-full transition-all duration-500 ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-400"
                          : task.status === "FAILED" || task.status === "CANCELLED"
                          ? "bg-rose-500"
                          : "bg-cyan-400"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (task.completedSteps / Math.max(1, task.stepsCount)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-500/10">
                  <div className="flex items-center gap-2">
                    {prUrl && (
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-purple-500/60 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 text-xs font-bold transition-all hover:shadow-[0_0_10px_#a855f7]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                        VIEW PULL REQUEST
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Approve & Run */}
                    {(task.status === "PENDING" ||
                      task.status === "AWAITING_APPROVAL" ||
                      task.status === "PLANNING") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveTask(task.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-400 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-extrabold transition-all shadow-[0_0_10px_#10b981] hover:scale-105 active:scale-95"
                          title="Authorize and execute this autonomous mission"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          APPROVE & RUN
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectTask(task.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-semibold transition-all hover:border-rose-400"
                          title="Abort and cancel this mission"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          REJECT
                        </button>
                      </>
                    )}

                    {/* Retry Mission */}
                    {(task.status === "FAILED" || task.status === "CANCELLED") && (
                      <button
                        type="button"
                        onClick={() => handleRetryTask(task.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-500/60 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-bold transition-all hover:border-amber-400 hover:shadow-[0_0_10px_#f59e0b]"
                        title="Re-run and retry this mission with fresh diagnostics"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        RETRY MISSION
                      </button>
                    )}

                    {/* View Diff */}
                    <button
                      type="button"
                      onClick={() => onViewDiff(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold transition-all hover:shadow-[0_0_8px_#10b981]"
                      title="Inspect unified code diff"
                    >
                      <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                      VIEW DIFF
                    </button>

                    {/* Inspect Logs */}
                    <button
                      type="button"
                      onClick={() => onInspectLogs(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold transition-all hover:shadow-[0_0_8px_#00f0ff]"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      INSPECT LOGS
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

