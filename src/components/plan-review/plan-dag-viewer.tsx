"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Terminal,
  RotateCcw,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanStep } from "@/lib/agents/planner/types";

export interface PlanDagViewerProps {
  steps: PlanStep[];
}

export function PlanDagViewer({ steps }: PlanDagViewerProps) {
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(
    new Set(steps.slice(0, 2).map((s) => s.id))
  );

  const toggleStep = (stepId: string) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Group steps by wave
  const wavesMap = new Map<number, PlanStep[]>();
  steps.forEach((step) => {
    const waveList = wavesMap.get(step.wave) ?? [];
    waveList.push(step);
    wavesMap.set(step.wave, waveList);
  });

  const sortedWaves = Array.from(wavesMap.keys()).sort((a, b) => a - b);

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case "migration":
        return "warning";
      case "delete":
        return "danger";
      case "create":
        return "success";
      case "modify":
        return "cyan";
      default:
        return "outline";
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "cyan";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-cyan-400" />
          <span>Execution Graph & Waves</span>
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          {sortedWaves.length} Waves • {steps.length} Steps
        </span>
      </div>

      <div className="space-y-6">
        {sortedWaves.map((waveNum) => {
          const waveSteps = wavesMap.get(waveNum) ?? [];
          return (
            <div
              key={waveNum}
              className="rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-3"
            >
              {/* Wave Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
                    Wave {waveNum}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {waveNum === 1
                      ? "Foundations & Contracts"
                      : `Execution Wave ${waveNum}`}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {waveSteps.length} {waveSteps.length === 1 ? "step" : "steps"}
                </span>
              </div>

              {/* Step Cards in Wave */}
              <div className="space-y-3">
                {waveSteps.map((step) => {
                  const isExpanded = expandedStepIds.has(step.id);
                  return (
                    <div
                      key={step.id}
                      className="rounded-md border border-white/5 bg-slate-950/60 p-3 space-y-2 hover:border-white/10 transition-colors"
                    >
                      {/* Step Summary Row (Clickable) */}
                      <div
                        onClick={() => toggleStep(step.id)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            toggleStep(step.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-cyan-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-mono text-xs text-cyan-400 font-semibold">
                            {step.id}
                          </span>
                          <span className="text-sm font-medium text-slate-100">
                            {step.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {step.requiresApproval && (
                            <Badge
                              variant="warning"
                              className="text-[10px] py-0 px-1.5 flex items-center gap-1"
                            >
                              <ShieldAlert className="h-3 w-3" />
                              Approval Gate
                            </Badge>
                          )}
                          <Badge
                            variant={getActionBadgeVariant(step.actionType)}
                            className="text-[10px] uppercase font-mono py-0 px-1.5"
                          >
                            {step.actionType}
                          </Badge>
                          <Badge
                            variant={getRiskBadgeVariant(step.riskLevel)}
                            className="text-[10px] uppercase font-mono py-0 px-1.5"
                          >
                            {step.riskLevel}
                          </Badge>
                        </div>
                      </div>

                      {/* Step Description */}
                      <p className="text-xs text-slate-300 pl-6">
                        {step.description}
                      </p>

                      {/* Dependencies */}
                      {step.dependencies.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-6 text-xs text-slate-400">
                          <span>Prerequisites:</span>
                          <div className="flex flex-wrap gap-1">
                            {step.dependencies.map((dep) => (
                              <Badge
                                key={dep}
                                variant="outline"
                                className="font-mono text-[10px] py-0 text-slate-300 border-white/10"
                              >
                                {dep}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded Technical Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/5 pl-6 space-y-2 text-xs">
                          {/* Targeted Files */}
                          <div>
                            <span className="text-slate-400 flex items-center gap-1 font-medium mb-1">
                              <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                              Targeted Files:
                            </span>
                            <ul className="space-y-0.5">
                              {step.filesTargeted.map((file, idx) => (
                                <li
                                  key={idx}
                                  className="font-mono text-[11px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-white/5"
                                >
                                  {file}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Verification Command */}
                          <div>
                            <span className="text-slate-400 flex items-center gap-1 font-medium mb-1">
                              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                              Verification Command:
                            </span>
                            <pre className="font-mono text-[11px] text-emerald-300 bg-slate-950 p-2 rounded border border-emerald-500/20 overflow-x-auto">
                              {step.verificationCommand}
                            </pre>
                          </div>

                          {/* Rollback Procedure */}
                          <div>
                            <span className="text-slate-400 flex items-center gap-1 font-medium mb-1">
                              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                              Rollback Procedure:
                            </span>
                            <pre className="font-mono text-[11px] text-amber-300 bg-slate-950 p-2 rounded border border-amber-500/20 overflow-x-auto whitespace-pre-wrap">
                              {step.rollbackProcedure}
                            </pre>
                          </div>

                          {/* Approval Reason if any */}
                          {step.approvalReason && (
                            <div className="p-2 rounded bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs">
                              <strong>Approval Required:</strong> {step.approvalReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
