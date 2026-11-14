'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // In local development or standalone mode, bypass or redirect to root
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mx-auto">
          <Bot className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to Jarvis</h1>
        <p className="text-xs text-muted-foreground">
          Enter administrator credentials to access the autonomous AI control plane.
        </p>
      </div>

      <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
        {error && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-300 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
            <Mail className="h-3.5 w-3.5" />
            <span>Email</span>
          </label>
          <input
            type="email"
            placeholder="admin@jarvis.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>Password</span>
          </label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Authenticate</span>
          )}
        </button>
      </form>
    </div>
  );
}
