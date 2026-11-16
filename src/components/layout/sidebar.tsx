"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Bot,
  ShieldCheck,
  Settings,
  GitBranch,
  Terminal,
} from "lucide-react";
import { Badge } from "../ui/badge";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

export interface SidebarProps {
  pendingApprovalsCount?: number;
}

export function Sidebar({ pendingApprovalsCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-surface-1 border-r border-surface-3 z-30 select-none"
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-surface-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-accent-cyan/30 text-accent-cyan shadow-sm shadow-accent-cyan/20">
          <Terminal className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-base text-text-primary">
              JARVIS
            </span>
            <span
              className="w-2 h-2 rounded-full bg-accent-cyan motion-safe:animate-pulse"
              title="System Online"
              aria-label="System status online"
            />
          </div>
          <span className="text-[10px] text-text-secondary tracking-wider uppercase font-mono">
            Command Center
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          const showBadge = item.href === "/approvals" && pendingApprovalsCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan ${
                isActive
                  ? "bg-surface-2 text-accent-cyan font-semibold border-l-2 border-accent-cyan"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-accent-cyan"
                      : "text-text-secondary group-hover:text-text-primary"
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </div>
              {showBadge && (
                <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                  {pendingApprovalsCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Governance & Status Footer */}
      <div className="p-4 border-t border-surface-3 bg-surface-1/50 flex flex-col gap-3">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/60 border border-surface-3 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <GitBranch className="w-3.5 h-3.5 text-accent-ice" aria-hidden="true" />
            <span className="font-mono">Branch</span>
          </div>
          <span className="font-mono font-semibold text-accent-ice bg-surface-3/50 px-2 py-0.5 rounded">
            main
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-secondary px-1">
          <span>Policy: Locked</span>
          <span className="font-mono text-success">v1.0 Nominal</span>
        </div>
      </div>
    </aside>
  );
}
