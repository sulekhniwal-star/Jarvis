'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, CheckCircle2, ShieldAlert, FolderGit2, ListTodo, PlusCircle } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Overview', icon: Bot },
    { href: '/tasks', label: 'Tasks', icon: ListTodo },
    { href: '/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/approvals', label: 'Approvals', icon: ShieldAlert },
  ];

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-foreground">JARVIS</span>
              <span className="ml-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
                Autonomous AI OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono bg-muted/60 border border-border px-3 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Budget:</span>
            <span className="text-emerald-400 font-semibold">₹25.00/day</span>
          </div>

          <Link
            href="/tasks/new"
            className="flex items-center space-x-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Task</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
