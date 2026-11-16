"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  Terminal,
  ShieldCheck,
  GitCommit,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AgentRunStatus } from "@/types/database";

export type RunStatus = AgentRunStatus;

export interface ExecutionStepTimelineProps {
  status: RunStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  errorSummary?: string | null;
  gitCommitHash?: string | null;
}

interface StepInfo {
  id: number;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  state: "completed" | "active" | "failed" | "pending";
}

export function ExecutionStepTimeline({
  status,
  startedAt,
  completedAt,
  errorSummary,
  gitCommitHash,
}: ExecutionStepTimelineProps) {
  // Determine step states based on overall run status
  const steps: StepInfo[] = React.useMemo(() => {
    switch (status) {
      case "queued":
        return [
          {
            id: 1,
            name: "Queued & Scoped",
            description: "Agent execution queued and sandbox environment scoped",
            icon: Clock,
            state: "active",
          },
          {
            id: 2,
            name: "Agent Execution",
            description: "Autonomous code generation and tool invocation",
            icon: Terminal,
            state: "pending",
          },
          {
            id: 3,
            name: "Verification Gate",
            description: "Diff inspection, AST analysis, and security verification",
            icon: ShieldCheck,
            state: "pending",
          },
          {
            id: 4,
            name: "Final Disposition",
            description: "Commit persistence or rollback handling",
            icon: GitCommit,
            state: "pending",
          },
        ];
      case "running":
        return [
          {
            id: 1,
            name: "Queued & Scoped",
            description: "Sandbox scoped and initial workspace initialized",
            icon: Clock,
            state: "completed",
          },
          {
            id: 2,
            name: "Agent Execution",
            description: "Active coding agent modifying workspace files",
            icon: Terminal,
            state: "active",
          },
          {
            id: 3,
            name: "Verification Gate",
            description: "Waiting for self-review and test validation",
            icon: ShieldCheck,
            state: "pending",
          },
          {
            id: 4,
            name: "Final Disposition",
            description: "Pending commit persistence",
            icon: GitCommit,
            state: "pending",
          },
        ];
      case "verifying":
        return [
          {
            id: 1,
            name: "Queued & Scoped",
            description: "Sandbox scoped and initial workspace initialized",
            icon: Clock,
            state: "completed",
          },
          {
            id: 2,
            name: "Agent Execution",
            description: "Coding agent execution completed",
            icon: Terminal,
            state: "completed",
          },
          {
            id: 3,
            name: "Verification Gate",
            description: "Inspecting git diff and validating self-review criteria",
            icon: ShieldCheck,
            state: "active",
          },
          {
            id: 4,
            name: "Final Disposition",
            description: "Pending verification outcome",
            icon: GitCommit,
            state: "pending",
          },
        ];
      case "completed":
        return [
          {
            id: 1,
            name: "Queued & Scoped",
            description: "Environment prepared cleanly",
            icon: Clock,
            state: "completed",
          },
          {
            id: 2,
            name: "Agent Execution",
            description: "Code modifications completed successfully",
            icon: Terminal,
            state: "completed",
          },
          {
            id: 3,
            name: "Verification Gate",
            description: "Diff inspection passed with zero blockers",
            icon: ShieldCheck,
            state: "completed",
          },
          {
            id: 4,
            name: "Final Disposition",
            description: gitCommitHash
              ? `Committed as ${gitCommitHash.slice(0, 7)}`
              : "Execution finished with clean disposition",
            icon: GitCommit,
            state: "completed",
          },
        ];
      case "failed":
      default:
        return [
          {
            id: 1,
            name: "Queued & Scoped",
            description: "Workspace initialized",
            icon: Clock,
            state: "completed",
          },
          {
            id: 2,
            name: "Agent Execution",
            description: "Coding agent execution encountered errors",
            icon: Terminal,
            state: "completed",
          },
          {
            id: 3,
            name: "Verification Gate",
            description: "Verification gate triggered failure or halted on error",
            icon: ShieldCheck,
            state: "completed",
          },
          {
            id: 4,
            name: "Final Disposition",
            description: errorSummary
              ? `Failed: ${errorSummary}`
              : "Execution failed with non-zero exit code",
            icon: AlertTriangle,
            state: "failed",
          },
        ];
    }
  }, [status, gitCommitHash, errorSummary]);

  const renderStepIcon = (step: StepInfo) => {
    switch (step.state) {
      case "completed":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "active":
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
        );
      case "failed":
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case "pending":
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-surface-3 text-text-secondary/50 flex items-center justify-center shrink-0">
            <step.icon className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <Card className="border-surface-3 bg-surface-1">
      <CardHeader className="pb-3 border-b border-surface-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            Execution Lifecycle Stepper
          </CardTitle>
          <div className="text-xs text-text-secondary font-mono">
            {startedAt && (
              <span>
                Started: {new Date(startedAt).toLocaleTimeString()}
              </span>
            )}
            {completedAt && (
              <span className="ml-3">
                Ended: {new Date(completedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col p-3 rounded-lg border transition-colors ${
                step.state === "active"
                  ? "bg-cyan-500/5 border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                  : step.state === "completed"
                  ? "bg-surface-2/40 border-surface-3"
                  : step.state === "failed"
                  ? "bg-rose-500/5 border-rose-500/30"
                  : "bg-surface-1/50 border-surface-3/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                {renderStepIcon(step)}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                    Stage {step.id}
                  </span>
                  <h4 className="text-xs font-semibold text-text-primary">
                    {step.name}
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary line-clamp-2 mt-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
