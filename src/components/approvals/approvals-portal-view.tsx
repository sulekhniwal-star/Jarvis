"use client";

import * as React from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Layers,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ApprovalRequestCard,
  EnrichedApprovalItem,
} from "./approval-request-card";
import { DecisionModal } from "./decision-modal";
import { ApprovalMetrics } from "@/lib/repositories/approval-repository";
import { ApprovalActionType, ApprovalStatus } from "@/types/database";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { RealtimePayload } from "@/lib/realtime/types";

export interface ApprovalsPortalViewProps {
  initialApprovals?: EnrichedApprovalItem[];
  initialMetrics?: ApprovalMetrics;
}

const ACTION_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "All Action Types", value: "all" },
  { label: "Git Remote Push", value: "git_remote_push" },
  { label: "Production Deploy", value: "production_deploy" },
  { label: "Paid AI Inference", value: "paid_ai_inference" },
  { label: "Destructive DB Mutation", value: "destructive_db_mutation" },
  { label: "External Message", value: "external_message" },
];

export function ApprovalsPortalView({
  initialApprovals = [],
  initialMetrics = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
  },
}: ApprovalsPortalViewProps) {
  const [approvals, setApprovals] = React.useState<EnrichedApprovalItem[]>(initialApprovals);
  const [selectedTab, setSelectedTab] = React.useState<
    "all" | "pending" | "approved" | "rejected" | "expired"
  >("all");
  const [selectedActionType, setSelectedActionType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Decision Modal State
  const [activeModal, setActiveModal] = React.useState<{
    isOpen: boolean;
    approval: EnrichedApprovalItem | null;
    decision: "approved" | "rejected";
  }>({
    isOpen: false,
    approval: null,
    decision: "approved",
  });

  // Re-fetch helper for polling/refresh button
  const fetchLatestApprovals = React.useCallback(async () => {
    try {
      const res = await fetch("/api/approvals?limit=100");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.approvals)) {
        setApprovals(data.approvals);
      }
    } catch (err) {
      console.warn("[ApprovalsPortalView] Failed to refresh approvals:", err);
    }
  }, []);

  // Supabase Realtime CDC subscription
  const handleRealtimeEvent = React.useCallback(
    (payload: RealtimePayload<any>) => {
      const record = payload.new;
      const oldRecord = payload.old;

      setApprovals((prev) => {
        if (payload.eventType === "INSERT") {
          if (!prev.some((a) => a.id === record.id)) {
            return [record as EnrichedApprovalItem, ...prev];
          }
          return prev;
        }

        if (payload.eventType === "UPDATE") {
          return prev.map((a) =>
            a.id === record.id ? { ...a, ...record } : a
          );
        }

        if (payload.eventType === "DELETE") {
          const targetId = oldRecord?.id || record?.id;
          return prev.filter((a) => a.id !== targetId);
        }

        return prev;
      });
    },
    []
  );

  const { status: realtimeStatus } = useRealtimeSubscription<any>({
    config: {
      table: "approvals",
      fallbackPollingInterval: 12000,
    },
    onEvent: handleRealtimeEvent,
    onPoll: fetchLatestApprovals,
  });

  // Live computed metrics derived from current approvals state
  const metrics = React.useMemo<ApprovalMetrics>(() => {
    const now = Date.now();
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let expired = 0;

    for (const item of approvals) {
      const isExpired = new Date(item.expires_at).getTime() <= now;
      if (item.status === "approved") {
        approved++;
      } else if (item.status === "rejected") {
        rejected++;
      } else if (item.status === "expired" || (item.status === "pending" && isExpired)) {
        expired++;
      } else if (item.status === "pending") {
        pending++;
      }
    }

    return {
      total: approvals.length,
      pending,
      approved,
      rejected,
      expired,
    };
  }, [approvals]);

  // Open Decision Modal
  const handleApprove = React.useCallback((item: EnrichedApprovalItem) => {
    setActiveModal({
      isOpen: true,
      approval: item,
      decision: "approved",
    });
  }, []);

  const handleReject = React.useCallback((item: EnrichedApprovalItem) => {
    setActiveModal({
      isOpen: true,
      approval: item,
      decision: "rejected",
    });
  }, []);

  const handleDecisionComplete = React.useCallback(
    (updatedApproval: any) => {
      setApprovals((prev) =>
        prev.map((item) =>
          item.id === updatedApproval.id
            ? {
                ...item,
                status: updatedApproval.status,
                decision_reason: updatedApproval.decision_reason,
                decided_at: updatedApproval.decided_at,
              }
            : item
        )
      );
    },
    []
  );

  // Client-side filtering
  const filteredApprovals = React.useMemo(() => {
    const now = Date.now();
    const query = searchQuery.trim().toLowerCase();

    return approvals.filter((item) => {
      const isPastExpiry = new Date(item.expires_at).getTime() <= now;

      // Status tab filter
      if (selectedTab === "pending") {
        if (item.status !== "pending" || isPastExpiry) return false;
      } else if (selectedTab === "approved") {
        if (item.status !== "approved") return false;
      } else if (selectedTab === "rejected") {
        if (item.status !== "rejected") return false;
      } else if (selectedTab === "expired") {
        if (item.status !== "expired" && !(item.status === "pending" && isPastExpiry)) {
          return false;
        }
      }

      // Action type filter
      if (selectedActionType !== "all" && item.action_type !== selectedActionType) {
        return false;
      }

      // Search query filter
      if (query) {
        const matchResource = item.target_resource.toLowerCase().includes(query);
        const matchAction = item.action_type.toLowerCase().includes(query);
        const matchTask = item.taskTitle?.toLowerCase().includes(query) ?? false;
        const matchProject = item.projectName?.toLowerCase().includes(query) ?? false;
        const matchReason = item.decision_reason?.toLowerCase().includes(query) ?? false;

        if (!matchResource && !matchAction && !matchTask && !matchProject && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [approvals, selectedTab, selectedActionType, searchQuery]);

  return (
    <div className="space-y-6 select-none" data-testid="approvals-portal-view">
      {/* Header and Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent-cyan" aria-hidden="true" />
            Human Approvals Portal
          </h1>
          <p className="text-sm text-text-secondary">
            Unified authority for sensitive repository, cloud deployment, and database operations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-surface-2 border border-surface-3 text-text-secondary">
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeStatus === "connected"
                  ? "bg-emerald-400"
                  : realtimeStatus === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-surface-3"
              }`}
              aria-hidden="true"
            />
            <span className="capitalize">{realtimeStatus}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLatestApprovals}
            title="Refresh approval records"
            aria-label="Refresh approvals"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Metrics Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="metrics-banner">
        <Card className="p-4 bg-surface-1 border-surface-3">
          <div className="text-xs text-text-secondary font-mono">Total Requests</div>
          <div className="text-2xl font-bold text-text-primary mt-1 font-mono">
            {metrics.total}
          </div>
        </Card>

        <Card className="p-4 bg-surface-1 border-surface-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-mono">Pending</span>
            {metrics.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 motion-safe:animate-pulse" />
            )}
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
            {metrics.pending}
          </div>
        </Card>

        <Card className="p-4 bg-surface-1 border-surface-3">
          <div className="text-xs text-emerald-400 font-mono">Approved</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {metrics.approved}
          </div>
        </Card>

        <Card className="p-4 bg-surface-1 border-surface-3">
          <div className="text-xs text-rose-400 font-mono">Rejected</div>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
            {metrics.rejected}
          </div>
        </Card>

        <Card className="p-4 bg-surface-1 border-surface-3 col-span-2 sm:col-span-1">
          <div className="text-xs text-text-secondary font-mono">Expired</div>
          <div className="text-2xl font-bold text-text-secondary mt-1 font-mono">
            {metrics.expired}
          </div>
        </Card>
      </div>

      {/* Filtering and Controls Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface-1 p-3 rounded-xl border border-surface-3">
        {/* Status Tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0"
          role="tablist"
          aria-label="Approval Status Filter"
        >
          {(
            [
              { key: "all", label: "All", count: metrics.total },
              { key: "pending", label: "Pending", count: metrics.pending },
              { key: "approved", label: "Approved", count: metrics.approved },
              { key: "rejected", label: "Rejected", count: metrics.rejected },
              { key: "expired", label: "Expired", count: metrics.expired },
            ] as const
          ).map((tab) => {
            const isActive = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-accent-cyan text-background font-semibold shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-surface-2 text-text-secondary"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Action Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Action Type Dropdown */}
          <div className="relative">
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              aria-label="Filter by action type"
              className="w-full sm:w-auto text-xs bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              data-testid="action-type-select"
            >
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resource, action, task..."
              aria-label="Search approvals"
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              data-testid="approvals-search-input"
            />
          </div>
        </div>
      </div>

      {/* Approvals Grid */}
      {filteredApprovals.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="approvals-grid"
        >
          {filteredApprovals.map((approval) => (
            <ApprovalRequestCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No approval requests found"
          description={
            searchQuery || selectedActionType !== "all" || selectedTab !== "all"
              ? "No approvals match the current filter and search criteria."
              : "No pending or historical human approval requests recorded in the system."
          }
          icon={Inbox}
        />
      )}

      {/* Decision Confirmation Modal */}
      <DecisionModal
        isOpen={activeModal.isOpen}
        onClose={() =>
          setActiveModal((prev) => ({ ...prev, isOpen: false, approval: null }))
        }
        approval={activeModal.approval}
        decision={activeModal.decision}
        onDecisionComplete={handleDecisionComplete}
      />
    </div>
  );
}
