'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [promptRaw, setPromptRaw] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In dev, provide default seed project or fetch
    setProjects([
      { id: '00000000-0000-0000-0000-000000000001', name: 'Jarvis Core Monorepo' },
    ]);
    setProjectId('00000000-0000-0000-0000-000000000001');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !promptRaw || !projectId) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          promptRaw,
          priority,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create task');
      }

      const { task } = await res.json();
      router.push(`/tasks/${task.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/tasks"
        className="inline-flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to tasks</span>
      </Link>

      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Intake New Task</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit vague requirements or explicit feature instructions. Jarvis will formalize specifications and plan execution.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
        {error && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Project Target */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Target Project <span className="text-rose-400">*</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Task Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Task Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Implement refresh token rotation in auth middleware"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {/* Raw Requirement Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Raw Requirements & Guidance <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={6}
            placeholder="Describe the desired behavior, constraints, relevant files, and acceptance criteria..."
            value={promptRaw}
            onChange={(e) => setPromptRaw(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Scheduling Task...</span>
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4" />
              <span>Create Task & Enqueue</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
