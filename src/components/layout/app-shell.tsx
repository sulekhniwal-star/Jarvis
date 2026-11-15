"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  pendingApprovalsCount?: number;
}

export function AppShell({
  children,
  title = "Overview",
  pendingApprovalsCount = 0,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* Skip to Main Content Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-accent-cyan text-background font-semibold rounded-lg shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar Dock */}
      <Sidebar pendingApprovalsCount={pendingApprovalsCount} />

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={title}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        <main
          id="main-content"
          tabIndex={-1}
          role="main"
          className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
