import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { taskRepo, agentRunRepo, DEFAULT_ADMIN_USER_ID } from '@/lib/services';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { TaskControlButtons } from './task-control-buttons';
import { ArrowLeft, Clock, GitCommit, ShieldAlert, Cpu } from 'lucide-react';

export const revalidate = 0;

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const [task, agentRuns] = await Promise.all([
    taskRepo.getById(id, DEFAULT_ADMIN_USER_ID),
    agentRunRepo.listByTask(id),
  ]);

  if (!task) {
    notFound();
  }

  const spec = (typeof task.specification === 'object' && task.specification !== null
    ? task.specification
    : {}) as Record<string, unknown>;

  const plan = (typeof task.implementation_plan === 'object' && task.implementation_plan !== null
    ? task.implementation_plan
    : {}) as Record<string, unknown>;

  return (
    <div className="space-y-8">
      {/* Header Navigation */}
      <div className="space-y-4">
        <Link
          href="/tasks"
          className="inline-flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to task queue</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <TaskStatusBadge status={task.status} />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{task.title}</h1>
            </div>
            <div className="flex items-center space-x-4 text-xs font-mono text-muted-foreground">
              <span>ID: {task.id}</span>
              <span>Version: {task.version}</span>
              <span>Retries: {task.retry_count}/{task.max_retries}</span>
              {task.target_branch && <span>Branch: {task.target_branch}</span>}
              {task.pr_number && <span>PR #{task.pr_number}</span>}
            </div>
          </div>

          {/* Interactive Start / Pause / Cancel / Abort controls */}
          <TaskControlButtons taskId={task.id} currentStatus={task.status} />
        </div>
      </div>

      {/* Grid: Prompt & Execution State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Requirements, Specs, Plan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Raw Prompt */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Initial Requirement Prompt
            </h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/40 font-mono">
              {task.prompt_raw}
            </p>
          </div>

          {/* Formalized Specification */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Autonomous Specification Contract
            </h3>
            {Object.keys(spec).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Specification agent has not yet generated acceptance criteria.
              </p>
            ) : (
              <div className="bg-muted/40 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto border border-border/50 max-h-72">
                <pre>{JSON.stringify(spec, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Implementation Plan */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Implementation Plan
            </h3>
            {Object.keys(plan).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Planning agent has not yet prepared code modification steps.
              </p>
            ) : (
              <div className="bg-muted/40 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto border border-border/50 max-h-72">
                <pre>{JSON.stringify(plan, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Agent Runs & Execution History */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span>Agent Execution Runs ({agentRuns.length})</span>
            </h3>

            {agentRuns.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No runner execution dispatched yet.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {agentRuns.map((run) => (
                  <div key={run.id} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{run.agent_type}</span>
                      <span className="font-mono text-muted-foreground">{run.status}</span>
                    </div>
                    <div className="text-muted-foreground font-mono">
                      Environment: {run.runner_environment}
                    </div>
                    {run.model_id && (
                      <div className="text-muted-foreground font-mono">
                        Model: {run.model_id}
                      </div>
                    )}
                    {run.actual_cost_inr > 0 && (
                      <div className="text-emerald-400 font-mono">
                        Cost: ₹{run.actual_cost_inr.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
