"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, ShieldAlert, User } from "lucide-react";
import { Badge } from "../ui/badge";

export interface TopbarProps {
  title?: string;
  onOpenMobileNav: () => void;
  pendingApprovalsCount?: number;
}

export function Topbar({
  title = "Overview",
  onOpenMobileNav,
  pendingApprovalsCount = 0,
}: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 h-16 bg-background/80 backdrop-blur-md border-b border-surface-3"
      role="banner"
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <h1 className="text-base lg:text-lg font-semibold text-text-primary tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right: Approvals Alert & User Profile Status */}
      <div className="flex items-center gap-3">
        {pendingApprovalsCount > 0 && (
          <Link
            href="/approvals"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-medium hover:bg-warning/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            aria-label={`${pendingApprovalsCount} pending approvals require review`}
          >
            <ShieldAlert className="w-4 h-4 text-warning" aria-hidden="true" />
            <span className="hidden sm:inline">Approvals Needed</span>
            <span className="bg-warning text-background font-bold px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingApprovalsCount}
            </span>
          </Link>
        )}

        <div className="flex items-center gap-2 pl-3 border-l border-surface-3">
          <Badge variant="cyan" pulse className="hidden sm:inline-flex">
            Online
          </Badge>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-2 border border-surface-3 text-text-secondary"
            title="Authenticated Owner"
            aria-label="Owner profile"
          >
            <User className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
