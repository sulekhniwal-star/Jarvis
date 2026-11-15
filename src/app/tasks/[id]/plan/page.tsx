import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PlanReviewView } from "@/components/plan-review";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { PlanRepository } from "@/lib/repositories/plan-repository";
import { PlanPayload, PlanPayloadSchema } from "@/lib/agents/planner/types";
import { EmptyState } from "@/components/ui/empty-state";
import { FileQuestion } from "lucide-react";

interface PlanReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanReviewPage({ params }: PlanReviewPageProps) {
  const { id: taskId } = await params;

  if (!taskId) {
    notFound();
  }

  // Resolve Supabase client
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    supabase = createAdminClient();
  }

  const taskRepo = new TaskRepository(supabase);
  const planRepo = new PlanRepository(supabase);

  let task = null;
  let planRecord = null;

  try {
    task = await taskRepo.getById(taskId);
    planRecord = await planRepo.findByTaskId(taskId);
  } catch {
    // If not found or database error
  }

  if (!task) {
    return (
      <AppShell>
        <EmptyState
          icon={FileQuestion}
          title="Task Not Found"
          description={`No task with ID '${taskId}' exists in the system.`}
        />
      </AppShell>
    );
  }

  if (!planRecord) {
    return (
      <AppShell>
        <EmptyState
          icon={FileQuestion}
          title="No Plan Available"
          description={`Task '${task.title}' has not yet generated an execution plan. Complete the specification phase first.`}
        />
      </AppShell>
    );
  }

  // Parse structured plan payload
  const rawPayload = {
    steps: planRecord.steps,
    dependencies: planRecord.dependencies,
    riskAssessment: planRecord.risk_assessment,
    requiredApprovals: planRecord.required_approvals,
  };

  const parsed = PlanPayloadSchema.safeParse(rawPayload);

  const planPayload: PlanPayload = parsed.success
    ? parsed.data
    : {
        steps: (planRecord.steps as any) ?? [],
        dependencies: (planRecord.dependencies as any) ?? [],
        riskAssessment: (planRecord.risk_assessment as any) ?? {
          overallRisk: "low",
          riskFactors: [],
          requiresHumanApproval: false,
          mitigations: [],
        },
        requiredApprovals: (planRecord.required_approvals as any) ?? [],
      };

  return (
    <AppShell>
      <PlanReviewView
        taskId={task.id}
        taskTitle={task.title}
        taskStatus={task.status}
        planId={planRecord.id}
        planVersion={planRecord.version}
        plan={planPayload}
        projectId={task.project_id}
      />
    </AppShell>
  );
}
