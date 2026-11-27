"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ShieldAlert, User, LogOut } from "lucide-react";
import { RealtimeStatusBadge } from "./realtime-status-badge";
import { EmergencyStopButton } from "../system/emergency-stop-button";

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
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      // Keep UI responsive
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 h-16 bg-background/80 backdrop-blur-md border-b border-surface-3"
      role="banner"
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
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
        <EmergencyStopButton />
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
          <RealtimeStatusBadge className="hidden sm:inline-flex" />
          <Link
            href="/settings"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-2 border border-surface-3 text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
            title="Owner Settings"
            aria-label="Owner profile"
          >
            <User className="w-4 h-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-surface-3 text-text-secondary hover:text-danger hover:border-danger/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:opacity-50"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
