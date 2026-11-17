import React from "react";
import {
  GitCommit,
  Rocket,
  Coins,
  Database,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApprovalActionType } from "@/types/database";

export interface ApprovalActionBadgeProps {
  actionType: ApprovalActionType | string;
  className?: string;
}

export function ApprovalActionBadge({
  actionType,
  className = "",
}: ApprovalActionBadgeProps) {
  switch (actionType) {
    case "git_remote_push":
      return (
        <Badge
          className={`bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[11px] gap-1 ${className}`}
        >
          <GitCommit className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Remote Push</span>
        </Badge>
      );
    case "production_deploy":
      return (
        <Badge
          className={`bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-[11px] gap-1 ${className}`}
        >
          <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Deploy</span>
        </Badge>
      );
    case "paid_ai_inference":
      return (
        <Badge
          className={`bg-amber-500/10 text-amber-400 border-amber-500/20 font-mono text-[11px] gap-1 ${className}`}
        >
          <Coins className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Paid Inference</span>
        </Badge>
      );
    case "destructive_db_mutation":
      return (
        <Badge
          className={`bg-rose-500/10 text-rose-400 border-rose-500/20 font-mono text-[11px] gap-1 ${className}`}
        >
          <Database className="w-3.5 h-3.5" aria-hidden="true" />
          <span>DB Mutation</span>
        </Badge>
      );
    case "external_message":
      return (
        <Badge
          className={`bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-mono text-[11px] gap-1 ${className}`}
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>External Message</span>
        </Badge>
      );
    default:
      return (
        <Badge
          className={`bg-surface-2 text-text-secondary border-surface-3 font-mono text-[11px] gap-1 ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{actionType.replace(/_/g, " ")}</span>
        </Badge>
      );
  }
}
