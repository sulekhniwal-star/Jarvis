"use client";

import * as React from "react";
import { User, CheckCircle2, Layers, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemoryCategory } from "@/types/database";

export interface MemoryCategoryBadgeProps {
  category: MemoryCategory;
  className?: string;
}

export function MemoryCategoryBadge({
  category,
  className = "",
}: MemoryCategoryBadgeProps) {
  switch (category) {
    case "user_preference":
      return (
        <Badge
          className={`bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[11px] font-medium capitalize flex items-center gap-1 ${className}`}
        >
          <User className="w-3 h-3 text-cyan-400" />
          Preference
        </Badge>
      );
    case "project_decision":
      return (
        <Badge
          className={`bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-medium capitalize flex items-center gap-1 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Decision
        </Badge>
      );
    case "architecture_pattern":
      return (
        <Badge
          className={`bg-purple-500/10 text-purple-400 border-purple-500/20 text-[11px] font-medium capitalize flex items-center gap-1 ${className}`}
        >
          <Layers className="w-3 h-3 text-purple-400" />
          Pattern
        </Badge>
      );
    case "historical_error":
    default:
      return (
        <Badge
          className={`bg-rose-500/10 text-rose-400 border-rose-500/20 text-[11px] font-medium capitalize flex items-center gap-1 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          Error
        </Badge>
      );
  }
}
