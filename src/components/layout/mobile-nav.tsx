"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, GitBranch, Terminal } from "lucide-react";
import { NAV_ITEMS } from "./sidebar";
import { Badge } from "../ui/badge";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  pendingApprovalsCount?: number;
}

export function MobileNav({
  isOpen,
  onClose,
  pendingApprovalsCount = 0,
}: MobileNavProps) {
  const pathname = usePathname();

  // Close on Escape key press
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile nav is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-1 border-r border-surface-3 p-6 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-surface-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-accent-cyan/30 text-accent-cyan">
                <Terminal className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="font-bold tracking-wider text-base text-text-primary">
                JARVIS
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Links */}
          <nav className="mt-6 space-y-1.5" aria-label="Mobile Navigation Links">
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
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan ${
                    isActive
                      ? "bg-surface-2 text-accent-cyan font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  {showBadge && (
                    <Badge
                      variant="warning"
                      className="px-1.5 py-0 text-[10px]"
                      aria-label={`${pendingApprovalsCount} pending approvals requiring review`}
                    >
                      {pendingApprovalsCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-surface-3 flex flex-col gap-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/60 border border-surface-3 text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <GitBranch className="w-3.5 h-3.5 text-accent-ice" aria-hidden="true" />
              <span className="font-mono">Branch</span>
            </div>
            <span className="font-mono font-semibold text-accent-ice">
              main
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
