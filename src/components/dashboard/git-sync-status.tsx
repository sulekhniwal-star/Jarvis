"use client";

import * as React from "react";
import {
  GitCommit,
  Lock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GitSyncStatus } from "@/lib/github/types";

export interface GitSyncStatusProps {
  initialStatus?: GitSyncStatus;
  refreshUrl?: string;
}

export function GitSyncStatusCard({
  initialStatus,
  refreshUrl = "/api/git/sync",
}: GitSyncStatusProps) {
  const [status, setStatus] = React.useState<GitSyncStatus | null>(
    initialStatus ?? null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStatus = React.useCallback(
    async (method: "GET" | "POST" = "GET") => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(refreshUrl, { method });
        if (!res.ok) {
          throw new Error(`Sync inquiry failed with HTTP ${res.status}`);
        }
        const data: GitSyncStatus = await res.json();
        setStatus(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUrl]
  );

  React.useEffect(() => {
    if (!initialStatus) {
      void fetchStatus("GET");
    }
  }, [initialStatus, fetchStatus]);

  const handleRefresh = () => {
    void fetchStatus("POST");
  };

  const getStatusBadge = () => {
    if (!status) {
      return (
        <Badge variant="outline">
          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
          Loading...
        </Badge>
      );
    }

    switch (status.status) {
      case "synced":
        return (
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Synced with origin/main
          </Badge>
        );
      case "ahead":
        return (
          <Badge variant="warning" pulse>
            <ArrowUpRight className="w-3 h-3 mr-1" />
            {status.aheadCount} ahead (Push Pending)
          </Badge>
        );
      case "behind":
        return (
          <Badge variant="ice">
            <ArrowDownLeft className="w-3 h-3 mr-1" />
            {status.behindCount} behind (Sync Required)
          </Badge>
        );
      case "diverged":
        return (
          <Badge variant="danger" pulse>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Diverged ({status.aheadCount} ahead, {status.behindCount} behind)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Status Unknown
          </Badge>
        );
    }
  };

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-accent-cyan" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">
              Repository Synchronization
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              <Lock className="w-3 h-3 mr-1 text-accent-cyan" />
              {status?.branch || "main"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Indicator Banner */}
        <div className="p-3 rounded-lg bg-surface-2/60 border border-surface-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-text-secondary">Tracking Remote</span>
            <span className="font-mono text-xs font-semibold text-text-primary">
              {status?.remoteRef || "origin/main"}
            </span>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Local HEAD Commit Info */}
        <div className="p-3 rounded-lg bg-surface-2/40 border border-surface-3/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5 text-accent-cyan" />
              Local HEAD
            </span>
            <span className="font-mono text-text-primary">
              {status?.localShortSha ? status.localShortSha : "—"}
            </span>
          </div>
          <p className="text-xs font-medium text-text-primary truncate">
            {status?.localCommitMessage || "No commit message available"}
          </p>
        </div>

        {/* Ahead / Behind & Working Tree Cleanliness Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-surface-2/40 border border-surface-3/60 flex flex-col justify-between">
            <span className="text-text-secondary">Commit Divergence</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-semibold text-text-primary flex items-center">
                <ArrowUpRight className="w-3 h-3 text-accent-cyan mr-0.5" />
                +{status?.aheadCount ?? 0}
              </span>
              <span className="font-mono font-semibold text-text-secondary flex items-center">
                <ArrowDownLeft className="w-3 h-3 text-accent-ice mr-0.5" />
                -{status?.behindCount ?? 0}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-2/40 border border-surface-3/60 flex flex-col justify-between">
            <span className="text-text-secondary">Working Tree</span>
            <div className="mt-1">
              {status?.isClean ? (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  Clean
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  {status?.uncommittedCount ?? 0} Modified
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Refresh action and timestamp */}
        <div className="pt-2 border-t border-surface-3/60 flex items-center justify-between text-xs text-text-secondary">
          <span>
            {status?.lastCheckedAt
              ? `Checked ${new Date(status.lastCheckedAt).toLocaleTimeString()}`
              : "Not checked yet"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-7 px-2 text-xs flex items-center gap-1"
          >
            <RefreshCw
              className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {error && (
          <p className="text-xs text-danger mt-1">
            ⚠️ {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
