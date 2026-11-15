import * as React from "react";
import Link from "next/link";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  actionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-surface-3 bg-surface-1/40 ${className}`}
      role="status"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-2 border border-surface-3 text-text-secondary mb-3">
        <Icon className="w-6 h-6 text-accent-ice" aria-hidden="true" />
      </div>
      <h4 className="text-base font-semibold text-text-primary mb-1">{title}</h4>
      <p className="text-sm text-text-secondary max-w-sm mb-4 leading-relaxed">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="primary" size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}

      {actionLabel && onAction && !actionHref && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
