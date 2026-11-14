import React from 'react';
import Link from 'next/link';
import { taskRepo, DEFAULT_ADMIN_USER_ID } from '@/lib/services';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { PlusCircle, ListTodo } from 'lucide-react';
import type { TaskStatus } from '@jarvis/database';

export const revalidate = 0;

interface TasksPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { status } = await searchParams;
  const filterStatus = status as TaskStatus | undefined;

  const tasks = await taskRepo.listByUser(DEFAULT_ADMIN_USER_ID, {
    status: filterStatus,
    limit: 50,
  });

  const filterTabs: { label: string; value?: string }[] = [
    { label: 'All Tasks' },
    { label: 'Intake', value: 'INTAKE' },
    { label: 'Planning', value: 'PLANNING' },
    { label: 'Running', value: 'RUNNING' },
    { label: 'Approvals', value: 'PENDING_APPROVAL' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Escalated', value: 'ESCALATED' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Task Queue & History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, filter, and inspect autonomous task execution pipelines.
          </p>
        </div>

        <Link
          href="/tasks/new"
          className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Task</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const isActive = (tab.value === undefined && !status) || status === tab.value;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/tasks?status=${tab.value}` : '/tasks'}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tasks Table */}
      {tasks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <ListTodo className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold text-foreground">No tasks found</h3>
          <p className="text-sm text-muted-foreground">
            {status ? `No tasks with status '${status}'.` : 'No tasks recorded in Jarvis yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm divide-y divide-border/60">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="p-5 flex items-center justify-between hover:bg-muted/40 transition-colors block"
            >
              <div className="space-y-1.5 pr-6">
                <div className="flex items-center space-x-3">
                  <TaskStatusBadge status={task.status} />
                  <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                    {task.title}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {task.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{task.prompt_raw}</p>
              </div>

              <div className="text-right shrink-0 text-xs font-mono text-muted-foreground space-y-1">
                <div>version {task.version}</div>
                <div>Retries: {task.retry_count}/{task.max_retries}</div>
                <div>{new Date(task.created_at).toLocaleDateString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
