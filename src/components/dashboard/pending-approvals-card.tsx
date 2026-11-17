"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Check, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { useRealtimeApprovals } from "@/hooks/use-realtime-approvals";

export interface PendingApprovalItem {
  id: string;
  actionType: string;
  targetResource: string;
  expiresAt: string;
  requestedAt?: string;
}

export interface PendingApprovalsCardProps {
  approvals?: PendingApprovalItem[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function PendingApprovalsCard({
  approvals: initialApprovals = [],
  onApprove,
  onReject,
}: PendingApprovalsCardProps) {
  const { approvals } = useRealtimeApprovals({ initialApprovals });
  const count = approvals.length;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent-ice" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">Human Approvals</CardTitle>
          </div>
          <Badge variant={count > 0 ? "warning" : "success"} pulse={count > 0}>
            {count > 0 ? `${count} Pending` : "Nominal"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        {count === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Approvals Pending"
            description="All automated operations are within authorized policy bounds. Zero approvals pending."
            className="border-none bg-transparent p-4"
          />
        ) : (
          <div className="space-y-3">
            {approvals.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-surface-2/60 border border-surface-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="text-[10px]">
                      {item.actionType}
                    </Badge>
                    <span className="font-mono text-xs text-text-primary truncate max-w-[180px]">
                      {item.targetResource}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-secondary">
                    Expires: {new Date(item.expiresAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {onApprove && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onApprove(item.id)}
                      aria-label={`Approve ${item.actionType}`}
                      className="h-7 px-2 text-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Approve
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReject(item.id)}
                      aria-label={`Reject ${item.actionType}`}
                      className="h-7 px-2 text-xs hover:border-danger hover:text-danger"
                    >
                      <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {count > 3 && (
              <div className="text-center pt-2">
                <Link
                  href="/approvals"
                  className="text-xs text-accent-cyan hover:underline"
                >
                  View all {count} pending approvals →
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
