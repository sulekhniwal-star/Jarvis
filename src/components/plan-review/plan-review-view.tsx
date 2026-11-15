"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { PlanReviewHeader } from "./plan-review-header";
import { PlanRiskBanner } from "./plan-risk-banner";
import { PlanDagViewer } from "./plan-dag-viewer";
import { PlanDecisionControls } from "./plan-decision-controls";
import { PlanPayload } from "@/lib/agents/planner/types";

export interface PlanReviewViewProps {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  planId: string;
  planVersion: number;
  plan: PlanPayload;
  projectId?: string;
}

export function PlanReviewView({
  taskId,
  taskTitle,
  taskStatus,
  planId,
  planVersion,
  plan,
  projectId,
}: PlanReviewViewProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(taskStatus);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compute total unique targeted files
  const targetedFilesSet = new Set<string>();
  plan.steps.forEach((s) => s.filesTargeted.forEach((f) => targetedFilesSet.add(f)));

  const totalWaves = Math.max(...plan.steps.map((s) => s.wave), 1);

  const handleApprove = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/plan/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to approve plan.");
      }

      setCurrentStatus(data.taskStatus ?? "running");
      setSuccessMessage(
        "Plan approved successfully! Task has transitioned to running status."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async (feedback: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/plan/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "request_revision", feedback }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to request revision.");
      }

      setCurrentStatus(data.taskStatus ?? "specifying");
      setSuccessMessage(
        "Revision requested. The task has transitioned back to specifying."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <PlanReviewHeader
        taskTitle={taskTitle}
        taskId={taskId}
        projectId={projectId}
        planVersion={planVersion}
        taskStatus={currentStatus}
        totalSteps={plan.steps.length}
        totalWaves={totalWaves}
        totalFiles={targetedFilesSet.size}
      />

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Risk Banner */}
      <PlanRiskBanner
        riskAssessment={plan.riskAssessment}
        requiredApprovals={plan.requiredApprovals}
      />

      {/* Execution DAG Viewer */}
      <PlanDagViewer steps={plan.steps} />

      {/* Decision Controls (Fixed / Footer) */}
      <PlanDecisionControls
        onApprove={handleApprove}
        onRequestRevision={handleRequestRevision}
        isProcessing={isProcessing}
        requiresHumanApproval={plan.riskAssessment.requiresHumanApproval}
      />

      {/* Footer Audit Metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
        <span>Plan Record: <code className="text-slate-400 font-mono">{planId}</code></span>
        <span>Milestone 2 Workflow</span>
      </div>
    </div>
  );
}
