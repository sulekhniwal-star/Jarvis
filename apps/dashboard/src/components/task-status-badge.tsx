import React from 'react';
import type { TaskStatus } from '@jarvis/database';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const getBadgeStyle = (s: TaskStatus) => {
    switch (s) {
      case 'INTAKE':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'SPECIFYING':
      case 'PLANNING':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'PENDING_APPROVAL':
        return 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse';
      case 'DISPATCHED':
      case 'RUNNING':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      case 'TESTING':
      case 'SELF_HEALING':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'PR_CREATED':
      case 'COMPLETED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'ESCALATED':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'CANCELLED':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'EMERGENCY_ABORTED':
        return 'bg-rose-950 text-rose-300 border-rose-800 font-semibold';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status
      )}`}
    >
      {status}
    </span>
  );
}
