'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskStatus } from '@jarvis/database';
import { Play, XCircle, AlertOctagon, Loader2 } from 'lucide-react';

interface TaskControlButtonsProps {
  taskId: string;
  currentStatus: TaskStatus;
}

export function TaskControlButtons({ taskId, currentStatus }: TaskControlButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = ['COMPLETED', 'CANCELLED', 'EMERGENCY_ABORTED'].includes(currentStatus);

  const handleAction = async (action: string) => {
    if (action === 'EMERGENCY_ABORT') {
      if (!confirm('Are you sure you want to trigger an EMERGENCY ABORT on this task?')) {
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to update task state');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (isTerminal) {
    return (
      <div className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
        Task is in terminal state ({currentStatus})
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      <div className="flex items-center space-x-2">
        {['INTAKE', 'PLANNING'].includes(currentStatus) && (
          <button
            onClick={() => handleAction('DISPATCH')}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span>Dispatch / Run</span>
          </button>
        )}

        <button
          onClick={() => handleAction('CANCEL')}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Cancel Task</span>
        </button>

        <button
          onClick={() => handleAction('EMERGENCY_ABORT')}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          <span>Emergency Abort</span>
        </button>
      </div>

      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
}
