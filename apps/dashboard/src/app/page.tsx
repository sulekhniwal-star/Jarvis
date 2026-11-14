import React from 'react';
import Link from 'next/link';
import {
  budgetManager,
  taskRepo,
  approvalRepo,
  projectRepo,
  DEFAULT_ADMIN_USER_ID,
} from '@/lib/services';
import type { TaskRow, ApprovalRequestRow, ProjectRow } from '@jarvis/database';
import { BudgetWidget } from '@/components/budget-widget';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { ApprovalCard } from '@/components/approval-card';
import {
  ListTodo,
  ShieldAlert,
  FolderGit2,
  ArrowRight,
  PlusCircle,
  Activity,
} from 'lucide-react';

export const revalidate = 0; // Dynamic server-rendered

export default async function DashboardPage() {
  const [budgetSummary, tasks, pendingApprovals, projects] = await Promise.all([
    budgetManager.getSummary(DEFAULT_ADMIN_USER_ID),
    taskRepo.listByUser(DEFAULT_ADMIN_USER_ID, { limit: 10 }),
    approvalRepo.listPendingByUser(DEFAULT_ADMIN_USER_ID),
    projectRepo.listByUser(DEFAULT_ADMIN_USER_ID),
  ]);

  const activeTasks = tasks.filter(
    (t: TaskRow) => !['COMPLETED', 'CANCELLED', 'EMERGENCY_ABORTED'].includes(t.status)
  );

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <span>Jarvis Control Center</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              ONLINE
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous software engineering orchestrator with bounded financial controls.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/tasks/new"
            className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Task</span>
          </Link>
        </div>
      </div>

      {/* Financial Health Controls */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
          <Activity className="h-4 w-4 text-primary" />
          <span>Financial Boundaries & Limits</span>
        </h2>
        <BudgetWidget summary={budgetSummary} />
      </section>

      {/* Pending Approvals Section (If Any) */}
      {pendingApprovals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Pending Action Approvals ({pendingApprovals.length})</span>
            </h2>
            <Link
              href="/approvals"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingApprovals.slice(0, 3).map((ticket: ApprovalRequestRow) => (
              <ApprovalCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      )}

      {/* Main Grid: Projects & Active Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks List */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <ListTodo className="h-4 w-4 text-primary" />
              <span>Active & Recent Tasks ({tasks.length})</span>
            </h2>
            <Link
              href="/tasks"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
            >
              <span>View All Tasks</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
              <ListTodo className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No tasks intake yet.</p>
              <Link
                href="/tasks/new"
                className="inline-flex items-center space-x-1.5 text-xs text-primary font-semibold hover:underline"
              >
                <span>Submit first task</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm divide-y divide-border/60">
              {tasks.map((task: TaskRow) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors block"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <TaskStatusBadge status={task.status} />
                      <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
                        {task.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.prompt_raw}
                    </p>
                  </div>

                  <div className="text-right shrink-0 text-xs font-mono text-muted-foreground">
                    <div>v{task.version}</div>
                    <div>{new Date(task.created_at).toLocaleDateString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Connected Projects */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <FolderGit2 className="h-4 w-4 text-cyan-400" />
              <span>Projects ({projects.length})</span>
            </h2>
            <Link
              href="/projects"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 divide-y divide-border/60 shadow-sm">
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No projects registered.</p>
            ) : (
              projects.map((p: ProjectRow) => (
                <div key={p.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {p.default_branch}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground truncate">
                    {p.github_repo_full_name}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
